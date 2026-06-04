// FASE 1.1 — Núcleo (puro, testável) das regras de palavra-chave → lifecycle.
// Sem dependência de React/Supabase para facilitar testes unitários.
import { LeadStage, STAGE_ORDER, LOSS_STAGES } from "@/types/lead";

export type KeywordMatchType = "contains" | "exact" | "regex";

export interface KeywordRule {
  id: string;
  keyword: string;
  matchType: KeywordMatchType;
  targetStage: LeadStage;
  priority: number;
  active: boolean;
  allowBackward: boolean;
}

// Minúsculas + remoção de acentos, para "não" casar com "nao".
export function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Uma mensagem casa com uma regra?
export function matchesRule(text: string, rule: KeywordRule): boolean {
  if (!rule.active || !rule.keyword) return false;
  if (rule.matchType === "regex") {
    try {
      return new RegExp(rule.keyword, "i").test(text || "");
    } catch {
      return false; // regex inválida nunca quebra o fluxo
    }
  }
  const t = normalizeText(text);
  const k = normalizeText(rule.keyword);
  if (!k) return false;
  if (rule.matchType === "exact") return t === k;
  return t.includes(k); // 'contains' (padrão)
}

// Primeira regra que casar, em ordem de priority asc (menor primeiro).
export function findMatchingRule(text: string, rules: KeywordRule[]): KeywordRule | null {
  const sorted = [...rules].filter((r) => r.active).sort((a, b) => a.priority - b.priority);
  for (const r of sorted) {
    if (matchesRule(text, r)) return r;
  }
  return null;
}

const LOSS = new Set<LeadStage>([...LOSS_STAGES, "perdido"]);

// Por padrão o lead só AVANÇA no funil. Mover para etapa de perda (lead_frio/perdido)
// é sempre permitido; retrocesso só quando a regra autoriza (allowBackward).
export function shouldApplyStageChange(
  current: LeadStage,
  target: LeadStage,
  allowBackward: boolean,
): boolean {
  if (current === target) return false;
  if (LOSS.has(target)) return true;
  if (allowBackward) return true;
  const ci = STAGE_ORDER.indexOf(current);
  const ti = STAGE_ORDER.indexOf(target);
  if (ci === -1 || ti === -1) return true; // sem como comparar → permite
  return ti > ci; // só avança
}

// Avaliação completa: dada a mensagem + regras + etapa atual, devolve a regra e a
// etapa-alvo se uma mudança deve acontecer, ou null.
export function evaluateKeywords(
  text: string,
  rules: KeywordRule[],
  currentStage: LeadStage,
): { rule: KeywordRule; target: LeadStage } | null {
  const rule = findMatchingRule(text, rules);
  if (!rule) return null;
  if (!shouldApplyStageChange(currentStage, rule.targetStage, rule.allowBackward)) return null;
  return { rule, target: rule.targetStage };
}
