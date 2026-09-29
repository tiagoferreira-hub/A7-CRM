import { useCallback, useEffect, useMemo, useState } from "react";
import { Lead } from "@/types/lead";
import { Conversation, Message } from "@/context/ConversationsContext";
import { usePlaybooks, Script } from "@/context/PlaybooksContext";
import { useProcedures } from "@/context/ProceduresContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { ScriptVarKey, buildScriptVars, missingVars, renderBlock } from "@/lib/scriptTemplate";
import {
  FUNNEL_MOMENTS, ResolvedMoment, ScriptMoment, byPosition, detectObjections,
  filterByTrilha, pickTrilha, resolveMoment, stepsForMoment, trilhasOf,
} from "@/lib/scriptMoments";

/** Leva o texto até o campo de mensagem, para a atendente editar antes de enviar. */
export const SCRIPT_INSERT_EVENT = "crm:scriptInsert";
/** Envia o texto direto na conversa (1 clique). */
export const SCRIPT_SEND_EVENT = "crm:scriptSend";

type FunnelMoment = Exclude<ScriptMoment, "objecao">;

export interface UseScriptPanel {
  /** Momento do atendimento derivado de etapa + agendamento, com o porquê. */
  resolved: ResolvedMoment;
  /** Momento em exibição: o escolhido à mão, senão o automático. */
  shownMoment: FunnelMoment | null;
  momentOverride: FunnelMoment | null;
  setMomentOverride: (m: FunnelMoment | null) => void;
  /** Momentos que têm ao menos um passo ativo — alimenta o seletor. */
  momentsWithSteps: FunnelMoment[];
  /** Trilhas (variações por procedimento) do momento em exibição. */
  trilhas: string[];
  /** Trilha em exibição: a escolhida à mão, senão a do procedimento do lead. */
  shownTrilha: string | null;
  setTrilhaOverride: (t: string | null) => void;
  /** Passos do momento: gerais + os da trilha em exibição, na ordem do painel. */
  steps: Script[];
  /** Todos os scripts de objeção ativos — valem em qualquer momento. */
  objections: Script[];
  /** Objeções cujos gatilhos aparecem na última mensagem da paciente. */
  detectedObjections: Script[];
  /** Variáveis resolvidas para o lead/conversa atual. */
  vars: Record<ScriptVarKey, string>;
  /** Coloca a mensagem no campo de texto, para editar antes de enviar. */
  insertBlock: (block: string, from: Script) => void;
  /**
   * Envia a mensagem direto. Se ainda houver variável sem valor (ex.: {dia1}),
   * NÃO envia: coloca no campo para a atendente completar.
   */
  sendBlock: (block: string, from: Script) => void;
}

/**
 * Caminho único de "momento → passos → interpolação → envio/inserção".
 * Qualquer superfície que ofereça script deve consumir este hook — não
 * reimplementar a seleção nem o dispatch, sob pena de a telemetria subcontar.
 */
export function useScriptPanel(
  lead: Lead | null,
  conversation: Conversation | null,
  messages: Message[] = [],
): UseScriptPanel {
  const { scripts, recordUsage } = usePlaybooks();
  const { procedures } = useProcedures();
  const { appointments } = useAppointments();
  const members = useCompanyMembers();
  const [momentOverride, setMomentOverride] = useState<FunnelMoment | null>(null);
  const [trilhaOverride, setTrilhaOverride] = useState<string | null>(null);

  // Escolhas manuais valem só para a conversa em que foram feitas.
  const leadId = lead?.id ?? null;
  useEffect(() => { setMomentOverride(null); setTrilhaOverride(null); }, [leadId]);
  // Trocar de momento zera a trilha escolhida (cada momento tem as suas).
  useEffect(() => { setTrilhaOverride(null); }, [momentOverride]);

  const resolved = useMemo(() => resolveMoment(lead, appointments), [lead, appointments]);
  const shownMoment = lead ? (momentOverride ?? resolved.moment) : null;

  const attendantName = useMemo(() => {
    const ownerId = conversation?.assignedTo ?? lead?.assignedTo ?? null;
    if (!ownerId) return null;
    return members.find(m => m.userId === ownerId)?.displayName ?? null;
  }, [conversation, lead, members]);

  const vars = useMemo(
    () => buildScriptVars({ lead, procedures, appointments, attendantName }),
    [lead, procedures, appointments, attendantName],
  );

  const momentSteps = useMemo(() => stepsForMoment(scripts, shownMoment), [scripts, shownMoment]);
  const trilhas = useMemo(() => trilhasOf(momentSteps), [momentSteps]);
  const autoTrilha = useMemo(() => pickTrilha(trilhas, vars.procedimento), [trilhas, vars.procedimento]);
  const shownTrilha = trilhaOverride ?? autoTrilha;
  const steps = useMemo(() => filterByTrilha(momentSteps, shownTrilha), [momentSteps, shownTrilha]);

  const momentsWithSteps = useMemo(
    () => FUNNEL_MOMENTS.filter(m => scripts.some(s => s.moment === m && s.isActive)),
    [scripts],
  );

  const objections = useMemo(
    () => scripts.filter(s => s.moment === "objecao" && s.isActive).sort(byPosition),
    [scripts],
  );

  // Só a paciente levanta objeção: olha a última mensagem RECEBIDA.
  const lastInbound = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === "inbound") return messages[i].body;
    }
    return "";
  }, [messages]);

  const detectedObjections = useMemo(
    () => detectObjections(lastInbound, objections),
    [lastInbound, objections],
  );

  // Telemetria: todo uso conta, e conta para o passo de onde a mensagem saiu.
  const track = useCallback((from: Script) => {
    if (conversation && lead) recordUsage(from.id, conversation.id, lead.id, lead.stage);
  }, [conversation, lead, recordUsage]);

  const insertBlock = useCallback((block: string, from: Script) => {
    const text = renderBlock(block, vars);
    window.dispatchEvent(new CustomEvent(SCRIPT_INSERT_EVENT, { detail: { text } }));
    track(from);
  }, [vars, track]);

  const sendBlock = useCallback((block: string, from: Script) => {
    if (missingVars(block, vars).length > 0) {
      insertBlock(block, from); // nunca enviar "{dia1}" para a paciente
      return;
    }
    const text = renderBlock(block, vars);
    window.dispatchEvent(new CustomEvent(SCRIPT_SEND_EVENT, { detail: { text } }));
    track(from);
  }, [vars, track, insertBlock]);

  return {
    resolved, shownMoment, momentOverride, setMomentOverride, momentsWithSteps,
    trilhas, shownTrilha, setTrilhaOverride,
    steps, objections, detectedObjections, vars, insertBlock, sendBlock,
  };
}
