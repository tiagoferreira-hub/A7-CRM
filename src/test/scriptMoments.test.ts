import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ALL_MOMENTS, FUNNEL_MOMENTS, MOMENT_HOME_STAGE, ScriptMoment,
  defaultOpenSections, detectObjections, homeStageOf, legacyMomentFromStage,
  matchesPhrase, parseScriptSections, resolveMoment,
} from "@/lib/scriptMoments";
import { LeadStage, STAGE_ALL } from "@/types/lead";
import { Appointment, AppointmentStatus } from "@/types/appointment";

const NOW = new Date("2026-09-29T12:00:00.000Z");

const lead = (stage: LeadStage) => ({ id: "lead-1", stage });

const appt = (scheduledAt: string, status: AppointmentStatus, over: Partial<Appointment> = {}): Appointment => ({
  id: `a-${scheduledAt}-${status}`, leadId: "lead-1", assignedTo: null, scheduledAt,
  durationMinutes: 60, type: "procedimento", status, notes: "", createdAt: "", ...over,
});

describe("resolveMoment — etapa é a verdade, momento é derivado", () => {
  it.each<[LeadStage, ScriptMoment | null]>([
    ["lead_entrou", "primeira_resposta"],
    ["hot_lead", "agendamento"],
    ["compareceu", "pos_atendimento"],
    ["fechou", "pos_venda"],
    ["lead_frio", "reativacao"],
    ["perdido", null],
  ])("%s → %s", (stage, moment) => {
    expect(resolveMoment(lead(stage), [], NOW).moment).toBe(moment);
  });

  it("agendado sem agendamento cadastrado → pré-comparecimento", () => {
    expect(resolveMoment(lead("agendado"), [], NOW).moment).toBe("pre_comparecimento");
  });

  it("agendado com horário futuro → pré-comparecimento", () => {
    const r = resolveMoment(lead("agendado"), [appt("2026-09-30T14:00:00.000Z", "agendado")], NOW);
    expect(r.moment).toBe("pre_comparecimento");
  });

  it("FALTOU: agendamento 'Não compareceu' → no-show, e o lead segue em agendado", () => {
    const r = resolveMoment(lead("agendado"), [appt("2026-09-28T14:00:00.000Z", "nao_compareceu")], NOW);
    expect(r.moment).toBe("no_show");
    expect(r.reason).toContain("Não compareceu");
  });

  it("faltou e JÁ REMARCOU para o futuro → volta a pré-comparecimento", () => {
    const r = resolveMoment(lead("agendado"), [
      appt("2026-09-28T14:00:00.000Z", "nao_compareceu"),
      appt("2026-10-02T10:00:00.000Z", "remarcado"),
    ], NOW);
    expect(r.moment).toBe("pre_comparecimento");
  });

  it("a falta mais recente vale; um comparecimento antigo não esconde o no-show", () => {
    const r = resolveMoment(lead("agendado"), [
      appt("2026-08-01T14:00:00.000Z", "compareceu"),
      appt("2026-09-28T14:00:00.000Z", "nao_compareceu"),
    ], NOW);
    expect(r.moment).toBe("no_show");
  });

  it("agendamento cancelado não conta como falta nem como horário futuro", () => {
    const r = resolveMoment(lead("agendado"), [
      appt("2026-09-28T14:00:00.000Z", "nao_compareceu"),
      appt("2026-10-02T10:00:00.000Z", "cancelado"),
    ], NOW);
    expect(r.moment).toBe("no_show");
  });

  it("ignora agendamentos de outro lead", () => {
    const r = resolveMoment(lead("agendado"), [
      appt("2026-09-28T14:00:00.000Z", "nao_compareceu", { leadId: "outra" }),
    ], NOW);
    expect(r.moment).toBe("pre_comparecimento");
  });

  it("no-show só existe dentro de agendado (lead frio segue em reativação)", () => {
    const r = resolveMoment(lead("lead_frio"), [appt("2026-09-28T14:00:00.000Z", "nao_compareceu")], NOW);
    expect(r.moment).toBe("reativacao");
  });

  it("sem lead não quebra", () => {
    expect(resolveMoment(null, [], NOW)).toEqual({ moment: null, reason: "" });
  });
});

describe("momentos × etapas", () => {
  it("todo momento do funil pertence a uma etapa real", () => {
    for (const m of FUNNEL_MOMENTS) expect(STAGE_ALL).toContain(MOMENT_HOME_STAGE[m]);
  });

  it("objeção não pertence a etapa nenhuma", () => {
    expect(homeStageOf("objecao")).toBeNull();
  });

  it("pré-comparecimento e no-show dividem a etapa agendado", () => {
    expect(MOMENT_HOME_STAGE.pre_comparecimento).toBe("agendado");
    expect(MOMENT_HOME_STAGE.no_show).toBe("agendado");
  });

  it("legado: script antigo em 'perdido' era a recuperação de no-show", () => {
    expect(legacyMomentFromStage("perdido")).toBe("no_show");
    expect(legacyMomentFromStage("agendado")).toBe("pre_comparecimento");
    expect(legacyMomentFromStage(null)).toBe("primeira_resposta");
  });
});

describe("matchesPhrase — detecção de objeção", () => {
  it("ignora acento e caixa", () => {
    expect(matchesPhrase("Ah, TÁ CARO demais", "ta caro")).toBe(true);
    expect(matchesPhrase("agora não dá", "agora nao")).toBe(true);
  });

  it("respeita fronteira de palavra (sem falso positivo)", () => {
    expect(matchesPhrase("Oi Carolina!", "caro")).toBe(false);
    expect(matchesPhrase("adorei o resultado", "dor")).toBe(false);
    expect(matchesPhrase("vai doer?", "doer")).toBe(true);
  });

  it("frase de várias palavras, com espaços extras na mensagem", () => {
    expect(matchesPhrase("vou   pensar e te aviso", "vou pensar")).toBe(true);
  });

  it("frase vazia nunca casa", () => {
    expect(matchesPhrase("qualquer coisa", "   ")).toBe(false);
  });
});

describe("detectObjections", () => {
  const scripts = [
    { id: "pensar", moment: "objecao" as ScriptMoment, triggers: ["vou pensar"], isActive: true },
    { id: "caro", moment: "objecao" as ScriptMoment, triggers: ["ta caro"], isActive: true },
    { id: "inativa", moment: "objecao" as ScriptMoment, triggers: ["vou pensar"], isActive: false },
    // Script de funil com "gatilho" não é objeção e não pode aparecer.
    { id: "funil", moment: "agendamento" as ScriptMoment, triggers: ["vou pensar"], isActive: true },
  ];

  it("devolve só objeções ativas cujo gatilho aparece", () => {
    expect(detectObjections("Hmm, vou pensar", scripts).map(s => s.id)).toEqual(["pensar"]);
  });

  it("várias objeções na mesma mensagem", () => {
    expect(detectObjections("tá caro, vou pensar", scripts).map(s => s.id).sort())
      .toEqual(["caro", "pensar"]);
  });

  it("mensagem vazia → nada", () => {
    expect(detectObjections("", scripts)).toEqual([]);
  });
});

describe("parseScriptSections — títulos organizam, nunca são enviados", () => {
  it("separa seções e mantém blocos antes do 1º título", () => {
    const s = parseScriptSections("Solto\n\n# Seção A\n\nA1\n\nA2\n\n## Seção B\n\nB1");
    expect(s).toEqual([
      { title: null, blocks: ["Solto"] },
      { title: "Seção A", blocks: ["A1", "A2"] },
      { title: "Seção B", blocks: ["B1"] },
    ]);
  });

  it("texto na linha logo abaixo do título vira bloco da seção", () => {
    expect(parseScriptSections("# Título\nprimeira mensagem")).toEqual([
      { title: "Título", blocks: ["primeira mensagem"] },
    ]);
  });

  it("nenhum bloco começa com '#'", () => {
    const blocks = parseScriptSections("# A\n\nx\n\n# B\n\ny").flatMap(s => s.blocks);
    expect(blocks.some(b => b.startsWith("#"))).toBe(false);
  });

  it("script sem títulos = uma seção sem título (compatível com os antigos)", () => {
    expect(parseScriptSections("a\n\nb")).toEqual([{ title: null, blocks: ["a", "b"] }]);
  });

  it("conteúdo vazio → nenhuma seção", () => {
    expect(parseScriptSections("")).toEqual([]);
  });
});

describe("defaultOpenSections", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

  it("script curto abre tudo", () => {
    const s = [{ title: "A", blocks: ["1"] }, { title: "B", blocks: ["2"] }];
    expect(defaultOpenSections(s, "Botox")).toEqual([true, true]);
  });

  it("script longo abre a 1ª seção e a do procedimento do lead", () => {
    const s = [
      { title: "Saudação", blocks: many(5) },
      { title: "Botox — diagnóstico", blocks: many(5) },
      { title: "Preenchimento labial — diagnóstico", blocks: many(5) },
    ];
    expect(defaultOpenSections(s, "Botox")).toEqual([true, true, false]);
    expect(defaultOpenSections(s, "Preenchimento Labial")).toEqual([true, false, true]);
  });

  it("script longo sem procedimento abre só a 1ª", () => {
    const s = [{ title: "A", blocks: many(8) }, { title: "B", blocks: many(8) }];
    expect(defaultOpenSections(s, "")).toEqual([true, false]);
  });
});

// ── Trava contra divergência: o mesmo mapeamento vive em TS e em SQL ─────────
describe("SQL e TS contam a mesma história", () => {
  const root = process.cwd();
  const migration = fs.readFileSync(
    path.join(root, "supabase/migrations/20260929120000_script_moments.sql"), "utf8");
  const seed = fs.readFileSync(path.join(root, "supabase/seeds/luminae_playbook.sql"), "utf8");

  const caseMap = (fnName: string) => {
    const start = migration.indexOf(`FUNCTION public.${fnName}`);
    const body = migration.slice(start, migration.indexOf("$$;", start));
    return Object.fromEntries([...body.matchAll(/WHEN '(\w+)'\s+THEN '(\w+)'/g)].map(m => [m[1], m[2]]));
  };

  it("script_moment_from_stage (SQL) = legacyMomentFromStage (TS)", () => {
    const sql = caseMap("script_moment_from_stage");
    expect(Object.keys(sql).sort()).toEqual([...STAGE_ALL].sort());
    for (const [stage, moment] of Object.entries(sql)) {
      expect(legacyMomentFromStage(stage)).toBe(moment);
    }
  });

  it("script_moment_home_stage (SQL) = MOMENT_HOME_STAGE (TS)", () => {
    expect(caseMap("script_moment_home_stage")).toEqual(MOMENT_HOME_STAGE);
  });

  it("o CHECK da migration aceita exatamente os momentos do código", () => {
    const check = migration.slice(migration.indexOf("scripts_moment_check CHECK"));
    const listed = [...check.slice(0, check.indexOf("));")).matchAll(/'(\w+)'/g)].map(m => m[1]);
    expect(listed.sort()).toEqual([...ALL_MOMENTS].sort());
  });

  it("cada script do seed usa um momento válido e a etapa-mãe certa", () => {
    const rows = [...seed.matchAll(/^\s+\('((?:[^']|'')*)', '(\w+)', (?:'(\w+)'|NULL::text), /gm)];
    expect(rows.length).toBeGreaterThan(0);
    for (const [, name, moment, stage] of rows) {
      expect(ALL_MOMENTS, name).toContain(moment);
      expect(stage ?? null, name).toBe(homeStageOf(moment as ScriptMoment));
    }
  });

  it("o seed cobre os momentos do documento da clínica + objeções", () => {
    const moments = new Set([...seed.matchAll(/^\s+\('(?:[^']|'')*', '(\w+)', /gm)].map(m => m[1]));
    for (const m of ["primeira_resposta", "agendamento", "pre_comparecimento", "no_show", "objecao"]) {
      expect(moments.has(m), m).toBe(true);
    }
  });
});
