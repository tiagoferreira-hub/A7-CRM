import { useCallback, useEffect, useMemo, useState } from "react";
import { Lead } from "@/types/lead";
import { Conversation, Message } from "@/context/ConversationsContext";
import { usePlaybooks, Script } from "@/context/PlaybooksContext";
import { useProcedures } from "@/context/ProceduresContext";
import { useAppointments } from "@/context/AppointmentsContext";
import { useCompanyMembers } from "@/hooks/useCompanyMembers";
import { ScriptVarKey, buildScriptVars, renderBlock } from "@/lib/scriptTemplate";
import {
  ResolvedMoment, ScriptSection, detectObjections, parseScriptSections, resolveMoment,
} from "@/lib/scriptMoments";

/** Evento que leva o texto até o campo de mensagem da tela Conversas. */
export const SCRIPT_INSERT_EVENT = "crm:scriptInsert";

export interface UseScriptPanel {
  /** Todos os scripts da company — alimenta o seletor de override. */
  scripts: Script[];
  /** Momento do atendimento derivado de etapa + agendamento, com o porquê. */
  resolved: ResolvedMoment;
  /** Script em exibição: o override manual, senão o ativo do momento. */
  activeScript: Script | null;
  overrideId: string | null;
  setOverrideId: (id: string | null) => void;
  /** Conteúdo do script ativo em seções (títulos `#` não são inseríveis). */
  sections: ScriptSection[];
  /** Todos os scripts de objeção ativos — valem em qualquer momento. */
  objections: Script[];
  /** Objeções cujos gatilhos aparecem na última mensagem da paciente. */
  detectedObjections: Script[];
  /** Variáveis resolvidas para o lead/conversa atual. */
  vars: Record<ScriptVarKey, string>;
  /**
   * Interpola, insere no campo de mensagem e registra o uso.
   * `from` é o script de onde o bloco saiu — o default é o script do momento;
   * blocos de objeção passam o próprio script, para a telemetria não misturar.
   */
  insertBlock: (block: string, from?: Script | null) => void;
}

/**
 * Caminho único de "momento → script → blocos → interpolação → inserção".
 * Qualquer superfície que ofereça script deve consumir este hook — não
 * reimplementar o split nem o dispatch, sob pena de a telemetria subcontar.
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
  const [overrideId, setOverrideId] = useState<string | null>(null);

  // A troca manual de script vale só para a conversa em que foi feita.
  const leadId = lead?.id ?? null;
  useEffect(() => { setOverrideId(null); }, [leadId]);

  const resolved = useMemo(() => resolveMoment(lead, appointments), [lead, appointments]);

  const activeScript = useMemo(() => {
    if (!lead) return null;
    if (overrideId) return scripts.find(s => s.id === overrideId) ?? null;
    if (!resolved.moment) return null;
    return scripts.find(s => s.moment === resolved.moment && s.isActive) ?? null;
  }, [lead, scripts, overrideId, resolved]);

  const sections = useMemo(
    () => parseScriptSections(activeScript?.content ?? ""),
    [activeScript],
  );

  const objections = useMemo(
    () => scripts.filter(s => s.moment === "objecao" && s.isActive),
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

  const attendantName = useMemo(() => {
    const ownerId = conversation?.assignedTo ?? lead?.assignedTo ?? null;
    if (!ownerId) return null;
    return members.find(m => m.userId === ownerId)?.displayName ?? null;
  }, [conversation, lead, members]);

  const vars = useMemo(
    () => buildScriptVars({ lead, procedures, appointments, attendantName }),
    [lead, procedures, appointments, attendantName],
  );

  const insertBlock = useCallback((block: string, from?: Script | null) => {
    const text = renderBlock(block, vars);
    window.dispatchEvent(new CustomEvent(SCRIPT_INSERT_EVENT, { detail: { text } }));
    // Telemetria: toda inserção conta, e conta para o script de onde o bloco saiu.
    const source = from ?? activeScript;
    if (source && conversation && lead) {
      recordUsage(source.id, conversation.id, lead.id, lead.stage);
    }
  }, [vars, activeScript, conversation, lead, recordUsage]);

  return {
    scripts, resolved, activeScript, overrideId, setOverrideId,
    sections, objections, detectedObjections, vars, insertBlock,
  };
}
