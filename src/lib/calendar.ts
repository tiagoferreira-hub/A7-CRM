// FASE 2 — Helpers puros de calendário (testáveis, sem React).
// Semana começa na segunda-feira (padrão comercial), mostrando Seg..Dom.

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Segunda-feira da semana que contém `d`.
export function startOfWeekMonday(d: Date): Date {
  const r = startOfDay(d);
  const day = r.getDay(); // 0=Dom..6=Sáb
  const diff = (day + 6) % 7; // quantos dias voltar até segunda
  return addDays(r, -diff);
}

// Os 7 dias da semana (Seg..Dom) que contém `d`.
export function getWeekDays(d: Date): Date[] {
  const start = startOfWeekMonday(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Reagenda mantendo o HORÁRIO, trocando apenas o DIA (para arrastar entre colunas).
export function rescheduleToDay(iso: string, targetDay: Date): string {
  const orig = new Date(iso);
  const r = new Date(targetDay);
  r.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
  return r.toISOString();
}

// Combina uma data (YYYY-MM-DD) + hora (HH:mm) locais num ISO.
export function combineDateTime(dateStr: string, timeStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, 0, 0).toISOString();
}

// Quebra um ISO em { date: 'YYYY-MM-DD', time: 'HH:mm' } locais (para preencher o modal).
export function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function weekdayLabel(d: Date): string {
  return WEEKDAY_LABELS[d.getDay()];
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
