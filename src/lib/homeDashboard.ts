// Regras puras do Dashboard inicial (tela "Dashboard", que substituiu o Kanban
// como tela de entrada). Sem React/Supabase para poder testar.
//
// A pergunta central da tela: QUEM ESTÁ ESPERANDO A CLÍNICA RESPONDER, e há
// quanto tempo. É onde a clínica perde paciente (ver Posicionamento no ROADMAP).

import { Lead, LeadStage, STAGE_ALL } from "@/types/lead";
import { FollowUp } from "@/types/automations";

/** Campos de conversa que a tela usa (subconjunto de Conversation). */
export interface ConvLike {
  id: string;
  leadId: string;
  channel: string;
  assignedTo: string | null;
  lastMessage: string;
  lastMessageAt: string;
  /**
   * ATENÇÃO ao sentido: true = a CLÍNICA mandou a última mensagem e espera a
   * PACIENTE (gatilho handle_new_message: outbound → true, inbound → false).
   */
  awaitingReply: boolean;
  status: "open" | "closed";
}

/**
 * A paciente falou por último e a clínica ainda não respondeu.
 * Conversa sem mensagem nenhuma não conta (não há o que responder).
 */
export function clinicOwesReply(c: ConvLike): boolean {
  return c.status === "open" && !c.awaitingReply && !!c.lastMessageAt && !!c.lastMessage?.trim();
}

/** Minutos desde `iso` até `now`; null se a data for inválida. */
export function minutesSince(iso: string, now: Date): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 60_000));
}

/** Duração compacta: "agora", "8m", "5h 12m", "3d 4h". */
export function formatWait(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  if (h < 24) {
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}

/** Faixa de urgência da espera — mesmas faixas de useWaitingTime. */
export type WaitTier = "fresh" | "warning" | "danger";
export function waitTier(minutes: number | null): WaitTier {
  if (minutes === null || minutes < 60) return "fresh";
  if (minutes < 60 * 24) return "warning";
  return "danger";
}

// ── Cartões por etapa ───────────────────────────────────────────────────────

export interface StageCard {
  stage: LeadStage;
  /** Leads nesta etapa. */
  total: number;
  /** Leads com conversa em que a clínica deve resposta. */
  owesReply: number;
  /** Leads sem responsável. */
  unassigned: number;
  /** Leads com follow-up ainda não concluído. */
  pendingFollowUp: number;
}

/** Um cartão para CADA uma das 7 etapas (fixas), mesmo as vazias. */
export function stageCards(leads: Lead[], conversations: ConvLike[], followUps: FollowUp[]): StageCard[] {
  const owing = new Set(conversations.filter(clinicOwesReply).map(c => c.leadId));
  const withFollowUp = new Set(followUps.filter(f => f.status !== "concluido").map(f => f.leadId));
  return STAGE_ALL.map(stage => {
    const inStage = leads.filter(l => l.stage === stage);
    return {
      stage,
      total: inStage.length,
      owesReply: inStage.filter(l => owing.has(l.id)).length,
      unassigned: inStage.filter(l => !l.assignedTo).length,
      pendingFollowUp: inStage.filter(l => withFollowUp.has(l.id)).length,
    };
  });
}

// ── Lista de contatos ───────────────────────────────────────────────────────

export type ContactTab = "owes" | "open" | "unassigned";

export interface ContactRow {
  conversationId: string;
  leadId: string;
  name: string;
  stage: LeadStage;
  channel: string;
  lastMessage: string;
  lastMessageAt: string;
  assignedTo: string | null;
  owesReply: boolean;
  /** Minutos desde a última mensagem. */
  minutes: number | null;
}

/**
 * Linhas da lista, por aba:
 * - "owes": a clínica deve resposta — quem espera há MAIS tempo primeiro;
 * - "open": todas as conversas abertas — mais recentes primeiro;
 * - "unassigned": abertas sem responsável — quem espera há mais tempo primeiro.
 * `stage` (opcional) restringe à etapa clicada no cartão.
 */
export function contactRows(
  leads: Lead[], conversations: ConvLike[], tab: ContactTab, now: Date, stage: LeadStage | null = null,
): ContactRow[] {
  const leadById = new Map(leads.map(l => [l.id, l]));
  const rows: ContactRow[] = [];
  for (const c of conversations) {
    if (c.status !== "open") continue;
    const lead = leadById.get(c.leadId);
    if (!lead) continue;
    if (stage && lead.stage !== stage) continue;
    const owes = clinicOwesReply(c);
    if (tab === "owes" && !owes) continue;
    if (tab === "unassigned" && c.assignedTo) continue;
    rows.push({
      conversationId: c.id, leadId: lead.id, name: lead.name, stage: lead.stage,
      channel: c.channel, lastMessage: c.lastMessage, lastMessageAt: c.lastMessageAt,
      assignedTo: c.assignedTo, owesReply: owes, minutes: minutesSince(c.lastMessageAt, now),
    });
  }
  const byWaitDesc = (a: ContactRow, b: ContactRow) => (b.minutes ?? -1) - (a.minutes ?? -1);
  const byRecent = (a: ContactRow, b: ContactRow) => b.lastMessageAt.localeCompare(a.lastMessageAt);
  return rows.sort(tab === "open" ? byRecent : byWaitDesc);
}

/** Quantas linhas cada aba tem, já com o filtro de etapa (se houver). */
export function contactCounts(
  leads: Lead[], conversations: ConvLike[], now: Date, stage: LeadStage | null = null,
): Record<ContactTab, number> {
  return {
    owes: contactRows(leads, conversations, "owes", now, stage).length,
    open: contactRows(leads, conversations, "open", now, stage).length,
    unassigned: contactRows(leads, conversations, "unassigned", now, stage).length,
  };
}

// ── Equipe ──────────────────────────────────────────────────────────────────

export interface MemberLoad {
  userId: string;
  displayName: string;
  /** Conversas abertas atribuídas. */
  assigned: number;
  /** Delas, quantas a clínica deve resposta. */
  owes: number;
  /** Maior espera entre as que devem resposta (min). */
  longestWait: number | null;
}

/** Carga por pessoa — quem tem mais pacientes esperando aparece primeiro. */
export function teamLoad(
  members: { userId: string; displayName: string }[], conversations: ConvLike[], now: Date,
): MemberLoad[] {
  return members
    .map(m => {
      const mine = conversations.filter(c => c.status === "open" && c.assignedTo === m.userId);
      const owing = mine.filter(clinicOwesReply);
      const waits = owing.map(c => minutesSince(c.lastMessageAt, now)).filter((x): x is number => x !== null);
      return {
        userId: m.userId, displayName: m.displayName,
        assigned: mine.length, owes: owing.length,
        longestWait: waits.length ? Math.max(...waits) : null,
      };
    })
    .sort((a, b) => b.owes - a.owes || b.assigned - a.assigned || a.displayName.localeCompare(b.displayName, "pt-BR"));
}
