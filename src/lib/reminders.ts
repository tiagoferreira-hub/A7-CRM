// C2 + D3 — Lembretes por tempo: helpers puros (testáveis) usados no preview do app.
// Espelham a lógica da função SQL run_time_based_reminders.

const DAY_MS = 24 * 60 * 60 * 1000;

// Data do próximo recall = data do procedimento + intervalo de recorrência (dias).
export function nextRecallDate(scheduledAtISO: string, recurrenceDays: number): Date {
  return new Date(new Date(scheduledAtISO).getTime() + recurrenceDays * DAY_MS);
}

// O recall já entrou na "janela de antecedência"? (lembrar X dias antes de vencer).
export function isRecallDue(
  scheduledAtISO: string,
  recurrenceDays: number,
  windowDays: number,
  now: Date = new Date(),
): boolean {
  if (!recurrenceDays || recurrenceDays <= 0) return false;
  const due = nextRecallDate(scheduledAtISO, recurrenceDays).getTime();
  return due <= now.getTime() + windowDays * DAY_MS;
}

// Quantos dias inteiros desde a última interação.
export function daysSince(lastInteractionISO: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(lastInteractionISO).getTime()) / DAY_MS);
}

// Lead "sem resposta": passou do limite de dias sem interação.
export function isNoReply(lastInteractionISO: string, days: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(lastInteractionISO).getTime() > days * DAY_MS;
}

// Etapas abertas que entram na varredura de "sem resposta".
export const OPEN_STAGES_FOR_NO_REPLY = ["lead_entrou", "hot_lead", "agendado"] as const;
