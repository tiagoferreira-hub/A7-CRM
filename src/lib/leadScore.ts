import { Lead } from "@/types/lead";

const STAGE_WEIGHT: Record<string, number> = {
  lead_entrou: 10,
  hot_lead:    35,
  agendado:    55,
  compareceu:  80,
  fechou:      100,
  lead_frio:   15,
  perdido:     5,
};

export function computeLeadScore(lead: Lead, now = new Date()): number {
  let score = STAGE_WEIGHT[lead.stage] ?? 10;

  // Freshness bonus/penalty
  const daysSince = lead.lastInteraction
    ? (now.getTime() - new Date(lead.lastInteraction).getTime()) / 86_400_000
    : 999;

  if (daysSince < 1)       score += 15;
  else if (daysSince < 3)  score += 10;
  else if (daysSince < 7)  score += 5;
  else if (daysSince > 14) score -= 10;

  // Context bonuses
  if (lead.value > 0)               score += 5;
  if (lead.procedureInterestId)     score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Quente", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
  if (score >= 45) return { label: "Morno",  color: "text-amber-600  bg-amber-50  border-amber-200"  };
  return             { label: "Frio",   color: "text-slate-500  bg-slate-50  border-slate-200"  };
}
