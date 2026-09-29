import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ALL_MOMENTS, FUNNEL_MOMENTS, GENERIC_TRILHA, MOMENT_HOME_STAGE, ScriptMoment, StepLike,
  defaultOpenSections, detectObjections, filterByTrilha, homeStageOf, legacyMomentFromStage,
  matchesPhrase, nextPosition, parseScriptSections, pickTrilha, resolveMoment, stepsForMoment, trilhasOf,
} from "@/lib/scriptMoments";
import { splitBlocks } from "@/lib/scriptTemplate";
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

  // Cada linha do seed: (nome, momento, etapa, trilha, ordem, gatilhos, $txt$conteúdo$txt$)
  const unq = (s?: string) => (s === undefined ? null : s.replace(/''/g, "'"));
  const seedSteps = [...seed.matchAll(
    /^\s+\('((?:[^']|'')*)', '(\w+)', (?:'(\w+)'|NULL::text), (?:'((?:[^']|'')*)'|NULL::text), (\d+), (?:ARRAY\[[^\n]*?\]::text\[\]|'\{\}'::text\[\]),\n\$txt\$([\s\S]*?)\$txt\$\)/gm,
  )].map(m => ({
    name: unq(m[1]) as string, moment: m[2] as ScriptMoment, stage: m[3] ?? null,
    trilha: unq(m[4]), position: Number(m[5]), content: m[6],
  }));

  it("o seed foi lido (se o formato mudar, este teste avisa)", () => {
    expect(seedSteps.length).toBeGreaterThan(50);
  });

  it("cada passo do seed usa um momento válido e a etapa-mãe certa", () => {
    for (const s of seedSteps) {
      expect(ALL_MOMENTS, s.name).toContain(s.moment);
      expect(s.stage, s.name).toBe(homeStageOf(s.moment));
    }
  });

  it("nomes únicos (o seed atualiza por nome) e ordem única dentro do momento", () => {
    expect(new Set(seedSteps.map(s => s.name)).size).toBe(seedSteps.length);
    const keys = seedSteps.map(s => `${s.moment}#${s.position}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cada passo tem mensagem e nenhuma é título '#'", () => {
    for (const s of seedSteps) {
      const blocks = splitBlocks(s.content);
      expect(blocks.length, s.name).toBeGreaterThan(0);
      expect(blocks.some(b => b.startsWith("#")), s.name).toBe(false);
    }
  });

  it("trilha só existe na primeira resposta, e a genérica bate com o código", () => {
    const withTrilha = seedSteps.filter(s => s.trilha);
    expect(withTrilha.every(s => s.moment === "primeira_resposta")).toBe(true);
    expect(trilhasOf(withTrilha as StepLike[] & typeof withTrilha)).toContain(GENERIC_TRILHA);
  });

  it("o seed cobre os momentos do documento da clínica + objeções", () => {
    const moments = new Set(seedSteps.map(s => s.moment));
    for (const m of ["primeira_resposta", "agendamento", "pre_comparecimento", "no_show", "objecao"]) {
      expect(moments.has(m as ScriptMoment), m).toBe(true);
    }
  });

  it("os scripts antigos de 'tudo num bloco' saem do painel e nenhum passo novo usa o nome deles", () => {
    const legacy = ["1ª Resposta — Diagnóstico", "Agendamento — Condução",
      "Confirmação D-1 + Lembrete", "Recuperação No-show"];
    const deactivate = seed.slice(seed.indexOf("SET is_active = false"));
    for (const name of legacy) {
      expect(deactivate, name).toContain(`'${name}'`);
      expect(seedSteps.some(s => s.name === name), name).toBe(false);
    }
  });

  it("o seed grava sem \\r (conteúdo colado no Windows)", () => {
    expect(seed).toContain("replace(r.content, chr(13), '')");
  });
});

describe("passos: vários scripts por momento", () => {
  const step = (name: string, moment: ScriptMoment, position: number, over: Partial<StepLike> = {}): StepLike =>
    ({ name, moment, position, isActive: true, trilha: null, ...over });

  it("stepsForMoment: só ativos do momento, em ordem", () => {
    const list = [
      step("C", "agendamento", 30), step("A", "agendamento", 10),
      step("B", "agendamento", 20, { isActive: false }), step("X", "no_show", 5),
    ];
    expect(stepsForMoment(list, "agendamento").map(s => s.name)).toEqual(["A", "C"]);
    expect(stepsForMoment(list, null)).toEqual([]);
  });

  it("empate de ordem desempata pelo nome", () => {
    const list = [step("Beta", "agendamento", 10), step("Alfa", "agendamento", 10)];
    expect(stepsForMoment(list, "agendamento").map(s => s.name)).toEqual(["Alfa", "Beta"]);
  });

  it("nextPosition: fim do momento, de 10 em 10; momento vazio começa em 10", () => {
    const list = [step("A", "agendamento", 10), step("B", "agendamento", 40), step("Z", "no_show", 90)];
    expect(nextPosition(list, "agendamento")).toBe(50);
    expect(nextPosition(list, "reativacao")).toBe(10);
  });
});

describe("trilhas: variações por procedimento", () => {
  const trilhas = ["Botox", "Preenchimento labial", "Corporal", GENERIC_TRILHA];

  it("abre a trilha do procedimento do lead, ignorando acento e caixa", () => {
    expect(pickTrilha(trilhas, "BOTOX")).toBe("Botox");
    expect(pickTrilha(trilhas, "Preenchimento Labial")).toBe("Preenchimento labial");
  });

  it("lead sem procedimento → trilha genérica", () => {
    expect(pickTrilha(trilhas, "")).toBe(GENERIC_TRILHA);
    expect(pickTrilha(trilhas, null)).toBe(GENERIC_TRILHA);
  });

  it("procedimento sem trilha → nenhuma (a atendente escolhe)", () => {
    expect(pickTrilha(trilhas, "Limpeza de pele")).toBeNull();
  });

  it("filterByTrilha: gerais sempre; da trilha só a escolhida", () => {
    const steps: StepLike[] = [
      { name: "Saudação", moment: "primeira_resposta", position: 10, isActive: true, trilha: null },
      { name: "Botox — diagnóstico", moment: "primeira_resposta", position: 110, isActive: true, trilha: "Botox" },
      { name: "Labial — diagnóstico", moment: "primeira_resposta", position: 210, isActive: true, trilha: "Preenchimento labial" },
    ];
    expect(filterByTrilha(steps, "Botox").map(s => s.name)).toEqual(["Saudação", "Botox — diagnóstico"]);
    expect(filterByTrilha(steps, null).map(s => s.name)).toEqual(["Saudação"]);
  });

  it("trilhasOf: distintas, na ordem em que aparecem", () => {
    const steps = [
      { trilha: "Botox" }, { trilha: null }, { trilha: "Botox" }, { trilha: "Corporal" },
    ].map((x, i) => ({ name: `s${i}`, moment: "primeira_resposta" as ScriptMoment, position: i, isActive: true, ...x }));
    expect(trilhasOf(steps)).toEqual(["Botox", "Corporal"]);
  });
});
