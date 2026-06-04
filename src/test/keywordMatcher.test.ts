import { describe, it, expect } from "vitest";
import {
  normalizeText,
  matchesRule,
  findMatchingRule,
  shouldApplyStageChange,
  evaluateKeywords,
  KeywordRule,
} from "@/lib/keywordMatcher";

const rule = (over: Partial<KeywordRule>): KeywordRule => ({
  id: "r",
  keyword: "agendamento marcado",
  matchType: "contains",
  targetStage: "agendado",
  priority: 100,
  active: true,
  allowBackward: false,
  ...over,
});

describe("normalizeText", () => {
  it("remove acentos e baixa caixa", () => {
    expect(normalizeText("Não Tenho Interesse")).toBe("nao tenho interesse");
  });
});

describe("matchesRule", () => {
  it("contains casa ignorando acento/caixa", () => {
    expect(matchesRule("Ok, agendamento MARCADO pra terça", rule({}))).toBe(true);
    expect(matchesRule("vamos ver", rule({}))).toBe(false);
  });
  it("exact exige igualdade total (normalizada)", () => {
    const r = rule({ keyword: "fechou", matchType: "exact" });
    expect(matchesRule("Fechou", r)).toBe(true);
    expect(matchesRule("fechou o pacote", r)).toBe(false);
  });
  it("regex funciona e regex inválida não quebra", () => {
    expect(matchesRule("R$ 1.200", rule({ keyword: "\\d{3,}", matchType: "regex" }))).toBe(true);
    expect(matchesRule("qualquer", rule({ keyword: "[", matchType: "regex" }))).toBe(false);
  });
  it("regra inativa nunca casa", () => {
    expect(matchesRule("agendamento marcado", rule({ active: false }))).toBe(false);
  });
});

describe("findMatchingRule", () => {
  it("retorna a regra de menor priority entre as que casam", () => {
    const rules = [
      rule({ id: "low", keyword: "pacote", targetStage: "fechou", priority: 30 }),
      rule({ id: "high", keyword: "pacote", targetStage: "fechou", priority: 10 }),
    ];
    expect(findMatchingRule("comprou o pacote", rules)?.id).toBe("high");
  });
});

describe("shouldApplyStageChange", () => {
  it("só avança por padrão", () => {
    expect(shouldApplyStageChange("lead_entrou", "agendado", false)).toBe(true);
    expect(shouldApplyStageChange("agendado", "hot_lead", false)).toBe(false);
  });
  it("permite retrocesso quando allowBackward", () => {
    expect(shouldApplyStageChange("agendado", "hot_lead", true)).toBe(true);
  });
  it("mover para lead_frio (perda) é sempre permitido", () => {
    expect(shouldApplyStageChange("fechou", "lead_frio", false)).toBe(true);
  });
  it("mesma etapa não muda", () => {
    expect(shouldApplyStageChange("agendado", "agendado", false)).toBe(false);
  });
});

describe("evaluateKeywords (critério de aceite 1.1)", () => {
  it("'agendamento marcado' move um lead novo para agendado", () => {
    const rules = [rule({ id: "ag" })];
    const hit = evaluateKeywords("agendamento marcado!", rules, "lead_entrou");
    expect(hit?.target).toBe("agendado");
    expect(hit?.rule.id).toBe("ag");
  });
  it("não move quando seria retrocesso sem permissão", () => {
    const rules = [rule({ id: "ag", keyword: "voltar", targetStage: "hot_lead" })];
    expect(evaluateKeywords("voltar", rules, "agendado")).toBeNull();
  });
});
