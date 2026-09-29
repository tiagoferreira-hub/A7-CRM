// Momento do atendimento — a chave que escolhe o script no painel.
//
// Dois eixos diferentes, que NÃO devem ser misturados:
// - ETAPA (lead.stage): onde o lead está no funil. Mede onde a clínica perde paciente.
//   São as 7 etapas de src/types/lead.ts, e elas não mudam por causa de script.
// - MOMENTO: o que a atendente precisa dizer agora. É mais fino que a etapa e é
//   DERIVADO dela + do status do agendamento. Ex.: um lead em `agendado` cujo
//   agendamento foi marcado "Não compareceu" continua em `agendado` no funil
//   (faltar não é perda), mas o momento é `no_show`.
//
// Objeção é um terceiro caso: não é etapa nem momento do funil. Vale em qualquer
// ponto do atendimento e nunca move o lead de etapa.

import { LeadStage, STAGE_LABELS } from "@/types/lead";
import { Appointment, APPOINTMENT_STATUS_LABELS } from "@/types/appointment";
import { normalizeText } from "@/lib/keywordMatcher";
import { splitBlocks } from "@/lib/scriptTemplate";

export type ScriptMoment =
  | "primeira_resposta"
  | "agendamento"
  | "pre_comparecimento"
  | "no_show"
  | "pos_atendimento"
  | "pos_venda"
  | "reativacao"
  | "objecao";

/** Momentos do funil, na ordem do atendimento. `objecao` fica de fora: é transversal. */
export const FUNNEL_MOMENTS: Exclude<ScriptMoment, "objecao">[] = [
  "primeira_resposta",
  "agendamento",
  "pre_comparecimento",
  "no_show",
  "pos_atendimento",
  "pos_venda",
  "reativacao",
];

export const ALL_MOMENTS: ScriptMoment[] = [...FUNNEL_MOMENTS, "objecao"];

export const MOMENT_LABELS: Record<ScriptMoment, string> = {
  primeira_resposta: "Primeira resposta",
  agendamento: "Agendamento",
  pre_comparecimento: "Pré-comparecimento",
  no_show: "No-show",
  pos_atendimento: "Pós-atendimento",
  pos_venda: "Pós-venda",
  reativacao: "Reativação",
  objecao: "Objeção",
};

/**
 * Etapa do funil a que cada momento pertence. Dois momentos podem dividir a
 * mesma etapa (pré-comparecimento e no-show são ambos `agendado`).
 * Também alimenta a coluna legada `scripts.stage`, para o código antigo seguir
 * funcionando enquanto a migration roda antes do merge.
 */
export const MOMENT_HOME_STAGE: Record<Exclude<ScriptMoment, "objecao">, LeadStage> = {
  primeira_resposta: "lead_entrou",
  agendamento: "hot_lead",
  pre_comparecimento: "agendado",
  no_show: "agendado",
  pos_atendimento: "compareceu",
  pos_venda: "fechou",
  reativacao: "lead_frio",
};

export const homeStageOf = (moment: ScriptMoment): LeadStage | null =>
  moment === "objecao" ? null : MOMENT_HOME_STAGE[moment];

/**
 * Mapeamento de LEGADO: scripts antigos só tinham `stage`. Espelha o backfill
 * da migration 20260929120000_script_moments.sql — manter os dois iguais.
 * `perdido` vira `no_show` porque era onde o seed antigo pendurava a
 * recuperação de no-show; não existe script de "perdido" no modelo novo.
 */
export function legacyMomentFromStage(stage: string | null | undefined): ScriptMoment {
  switch (stage) {
    case "lead_entrou": return "primeira_resposta";
    case "hot_lead": return "agendamento";
    case "agendado": return "pre_comparecimento";
    case "compareceu": return "pos_atendimento";
    case "fechou": return "pos_venda";
    case "lead_frio": return "reativacao";
    case "perdido": return "no_show";
    default: return "primeira_resposta";
  }
}

// ── Resolução do momento a partir do estado real ────────────────────────────

export interface ResolvedMoment {
  /** null = nenhum script de funil se aplica (ex.: lead `perdido`). */
  moment: Exclude<ScriptMoment, "objecao"> | null;
  /** Explicação curta para a atendente entender por que caiu nesse momento. */
  reason: string;
}

const ACTIVE_FUTURE_STATUSES = new Set(["agendado", "remarcado"]);

/**
 * Deriva o momento do atendimento. Pura: não lê contexto nem banco.
 * Só `agendado` depende do agendamento — as outras etapas têm momento único.
 */
export function resolveMoment(
  lead: { id: string; stage: LeadStage } | null,
  appointments: Appointment[] = [],
  now: Date = new Date(),
): ResolvedMoment {
  if (!lead) return { moment: null, reason: "" };
  const stageLabel = STAGE_LABELS[lead.stage] ?? lead.stage;

  switch (lead.stage) {
    case "lead_entrou": return { moment: "primeira_resposta", reason: stageLabel };
    case "hot_lead": return { moment: "agendamento", reason: stageLabel };
    case "compareceu": return { moment: "pos_atendimento", reason: stageLabel };
    case "fechou": return { moment: "pos_venda", reason: stageLabel };
    case "lead_frio": return { moment: "reativacao", reason: stageLabel };
    case "perdido": return { moment: null, reason: stageLabel };
    case "agendado": break;
    default: return { moment: null, reason: stageLabel };
  }

  // Etapa `agendado`: o agendamento decide entre pré-comparecimento e no-show.
  const mine = (appointments ?? [])
    .filter(a => a.leadId === lead.id && a.status !== "cancelado")
    .filter(a => !Number.isNaN(new Date(a.scheduledAt).getTime()))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // Já remarcou: um horário futuro ativo vence qualquer falta anterior.
  const upcoming = mine.find(a =>
    ACTIVE_FUTURE_STATUSES.has(a.status) && new Date(a.scheduledAt).getTime() >= now.getTime());
  if (upcoming) return { moment: "pre_comparecimento", reason: stageLabel };

  const latest = mine[mine.length - 1];
  if (latest?.status === "nao_compareceu") {
    return {
      moment: "no_show",
      reason: `${stageLabel} · agendamento “${APPOINTMENT_STATUS_LABELS.nao_compareceu}”`,
    };
  }
  return { moment: "pre_comparecimento", reason: stageLabel };
}

// ── Detecção de objeção na mensagem da paciente ─────────────────────────────

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const squash = (s: string) => normalizeText(s).replace(/\s+/g, " ");

/**
 * A frase aparece na mensagem como palavra(s) inteira(s)?
 * Sem acento e sem caixa. A fronteira de palavra evita falso positivo:
 * "caro" não casa com "Carolina", "dor" não casa com "adorei".
 */
export function matchesPhrase(text: string, phrase: string): boolean {
  const p = squash(phrase);
  if (!p) return false;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(p)}([^a-z0-9]|$)`);
  return re.test(squash(text));
}

export interface ObjectionLike {
  id: string;
  moment: ScriptMoment;
  triggers: string[];
  isActive: boolean;
}

/** Scripts de objeção ativos cujos gatilhos aparecem no texto. */
export function detectObjections<T extends ObjectionLike>(text: string, scripts: T[]): T[] {
  if (!text?.trim()) return [];
  return scripts.filter(s =>
    s.moment === "objecao" && s.isActive &&
    (s.triggers ?? []).some(t => matchesPhrase(text, t)));
}

// ── Estrutura do conteúdo: seções com título ────────────────────────────────

export interface ScriptSection {
  /** null = blocos antes do primeiro título. */
  title: string | null;
  blocks: string[];
}

/**
 * Um bloco cuja 1ª linha começa com `#` é TÍTULO de seção: aparece no painel
 * para orientar a atendente, mas nunca é inserido na mensagem.
 * Linhas depois do título, no mesmo bloco, viram um bloco normal.
 */
export function parseScriptSections(content: string): ScriptSection[] {
  const sections: ScriptSection[] = [];
  let current: ScriptSection = { title: null, blocks: [] };

  for (const block of splitBlocks(content)) {
    const [first, ...rest] = block.split("\n");
    if (/^#+\s*/.test(first)) {
      if (current.title !== null || current.blocks.length > 0) sections.push(current);
      current = { title: first.replace(/^#+\s*/, "").trim(), blocks: [] };
      const body = rest.join("\n").trim();
      if (body) current.blocks.push(body);
    } else {
      current.blocks.push(block);
    }
  }
  if (current.title !== null || current.blocks.length > 0) sections.push(current);
  return sections;
}

/** Acima disso o script é longo demais para abrir tudo de uma vez. */
export const COLLAPSE_THRESHOLD_BLOCKS = 12;

/**
 * Quais seções nascem abertas. Script curto: todas. Script longo (ex.: a primeira
 * resposta, com uma trilha por procedimento): a primeira seção, as sem título e
 * as que citam o procedimento do lead. O resto a atendente abre com um clique.
 */
export function defaultOpenSections(sections: ScriptSection[], procedimento?: string | null): boolean[] {
  const total = sections.reduce((n, s) => n + s.blocks.length, 0);
  if (sections.length <= 1 || total <= COLLAPSE_THRESHOLD_BLOCKS) return sections.map(() => true);
  return sections.map((s, i) =>
    i === 0 || s.title === null || (!!procedimento && matchesPhrase(s.title, procedimento)));
}
