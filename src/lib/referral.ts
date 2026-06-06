// M-B — Programa de indicação: métricas puras (testáveis) sobre Lead[].
import { Lead } from "@/types/lead";

export interface ReferrerStat {
  referrerId: string;
  referred: number; // total de indicados
  won: number;      // indicados que fecharam
  value: number;    // valor dos indicados fechados
  rate: number;     // won/referred*100
}

// Ranking dos clientes que mais indicaram (e converteram).
export function referrerRanking(leads: Lead[]): ReferrerStat[] {
  const map: Record<string, ReferrerStat> = {};
  for (const l of leads) {
    const ref = l.referredByLeadId;
    if (!ref) continue;
    if (!map[ref]) map[ref] = { referrerId: ref, referred: 0, won: 0, value: 0, rate: 0 };
    map[ref].referred++;
    if (l.stage === "fechou") {
      map[ref].won++;
      map[ref].value += l.value || 0;
    }
  }
  return Object.values(map)
    .map((s) => ({ ...s, rate: s.referred ? (s.won / s.referred) * 100 : 0 }))
    .sort((a, b) => b.referred - a.referred || b.won - a.won);
}

export interface ReferralSummary {
  totalReferred: number;
  won: number;
  rate: number;
  value: number;
  activeReferrers: number;
}

export function referralSummary(leads: Lead[]): ReferralSummary {
  const referred = leads.filter((l) => l.referredByLeadId);
  const won = referred.filter((l) => l.stage === "fechou");
  const refs = new Set(referred.map((l) => l.referredByLeadId as string));
  return {
    totalReferred: referred.length,
    won: won.length,
    rate: referred.length ? (won.length / referred.length) * 100 : 0,
    value: won.reduce((s, l) => s + (l.value || 0), 0),
    activeReferrers: refs.size,
  };
}

// Link de indicação (v1): o id do indicador em ?ref=. A Edge Function pública (v2)
// resolverá esse id e gravará referred_by_lead_id no novo lead.
export function referralLink(origin: string, referrerLeadId: string): string {
  return `${origin}/?ref=${referrerLeadId}&channel=indicacao`;
}
