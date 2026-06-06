// FASE / M-C — Métricas de conversão (puras, testáveis). Operam sobre Lead[].
import { Lead } from "@/types/lead";

export interface ConvRow {
  key: string;
  total: number;
  won: number;   // chegaram em "fechou"
  lost: number;  // perdido ou lead_frio
  rate: number;  // won / total * 100
  value: number; // soma do valor dos "fechou"
}

export const isWon = (l: Lead) => l.stage === "fechou";
export const isLost = (l: Lead) => l.stage === "perdido" || l.stage === "lead_frio";

// Agrupa leads por uma chave e calcula total/ganhos/perdidos/taxa/valor.
export function groupConversion(leads: Lead[], keyOf: (l: Lead) => string): ConvRow[] {
  const map: Record<string, ConvRow> = {};
  for (const l of leads) {
    const k = keyOf(l) || "—";
    if (!map[k]) map[k] = { key: k, total: 0, won: 0, lost: 0, rate: 0, value: 0 };
    map[k].total++;
    if (isWon(l)) {
      map[k].won++;
      map[k].value += l.value || 0;
    }
    if (isLost(l)) map[k].lost++;
  }
  return Object.values(map)
    .map((r) => ({ ...r, rate: r.total ? (r.won / r.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function winRate(leads: Lead[]): number {
  if (!leads.length) return 0;
  return (leads.filter(isWon).length / leads.length) * 100;
}

export function avgTicket(leads: Lead[]): number {
  const won = leads.filter(isWon);
  if (!won.length) return 0;
  return won.reduce((s, l) => s + (l.value || 0), 0) / won.length;
}

export function totalWonValue(leads: Lead[]): number {
  return leads.filter(isWon).reduce((s, l) => s + (l.value || 0), 0);
}

export function lossReasonBreakdown(leads: Lead[]): { reason: string; count: number }[] {
  const map: Record<string, number> = {};
  leads
    .filter((l) => l.stage === "perdido")
    .forEach((l) => {
      const r = (l.lossReason && l.lossReason.trim()) || "Sem motivo informado";
      map[r] = (map[r] || 0) + 1;
    });
  return Object.entries(map)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
