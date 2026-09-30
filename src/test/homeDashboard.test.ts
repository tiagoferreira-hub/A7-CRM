import { describe, it, expect } from "vitest";
import {
  ConvLike, clinicOwesReply, contactCounts, contactRows, formatWait, minutesSince,
  stageCards, teamLoad, waitTier,
} from "@/lib/homeDashboard";
import { Lead, LeadStage } from "@/types/lead";
import { FollowUp } from "@/types/automations";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();

const lead = (id: string, stage: LeadStage, over: Partial<Lead> = {}): Lead => ({
  id, name: `Lead ${id}`, phone: "", origin: "manual", stage, service: "", value: 0,
  lastMessage: "", lastInteraction: "", observations: "", createdAt: "", assignedTo: null, ...over,
});
const conv = (id: string, leadId: string, over: Partial<ConvLike> = {}): ConvLike => ({
  id, leadId, channel: "whatsapp", assignedTo: null, lastMessage: "oi", lastMessageAt: ago(10),
  awaitingReply: false, status: "open", ...over,
});

describe("clinicOwesReply — o sentido de awaitingReply", () => {
  it("paciente falou por último (awaitingReply=false) → clínica deve resposta", () => {
    expect(clinicOwesReply(conv("c", "l", { awaitingReply: false }))).toBe(true);
  });
  it("clínica falou por último (awaitingReply=true) → NÃO deve; está esperando a paciente", () => {
    expect(clinicOwesReply(conv("c", "l", { awaitingReply: true }))).toBe(false);
  });
  it("conversa fechada ou sem mensagem nenhuma não conta", () => {
    expect(clinicOwesReply(conv("c", "l", { status: "closed" }))).toBe(false);
    expect(clinicOwesReply(conv("c", "l", { lastMessage: "" }))).toBe(false);
    expect(clinicOwesReply(conv("c", "l", { lastMessageAt: "" }))).toBe(false);
  });
});

describe("formatWait / waitTier / minutesSince", () => {
  it.each<[number | null, string]>([
    [null, "—"], [0, "agora"], [8, "8m"], [60, "1h"], [312, "5h 12m"],
    [24 * 60, "1d"], [3 * 1440 + 4 * 60 + 30, "3d 4h"],
  ])("%s min → %s", (m, s) => expect(formatWait(m)).toBe(s));

  it("faixas iguais às do aviso de espera: <1h, até 24h, 24h+", () => {
    expect(waitTier(59)).toBe("fresh");
    expect(waitTier(60)).toBe("warning");
    expect(waitTier(24 * 60)).toBe("danger");
    expect(waitTier(null)).toBe("fresh");
  });

  it("data inválida não vira número", () => {
    expect(minutesSince("não é data", NOW)).toBeNull();
    expect(minutesSince(ago(15), NOW)).toBe(15);
  });
});

describe("stageCards", () => {
  const leads = [
    lead("1", "lead_entrou"), lead("2", "lead_entrou", { assignedTo: "u1" }),
    lead("3", "agendado", { assignedTo: "u1" }), lead("4", "perdido"),
  ];
  const convs = [
    conv("c1", "1", { awaitingReply: false }), // deve resposta
    conv("c2", "2", { awaitingReply: true }),  // espera a paciente
    conv("c3", "3", { awaitingReply: false }), // deve resposta
  ];
  const fups: FollowUp[] = [
    { id: "f1", leadId: "3", assignedTo: null, scheduledAt: "", notes: "", status: "pendente", completedAt: null, createdAt: "" },
    { id: "f2", leadId: "1", assignedTo: null, scheduledAt: "", notes: "", status: "concluido", completedAt: "", createdAt: "" },
  ];
  const cards = stageCards(leads, convs, fups);
  const of = (s: LeadStage) => cards.find(c => c.stage === s)!;

  it("um cartão para cada uma das 7 etapas, inclusive as vazias e Perdido", () => {
    expect(cards.map(c => c.stage)).toEqual(
      ["lead_entrou", "hot_lead", "agendado", "compareceu", "fechou", "lead_frio", "perdido"]);
    expect(of("hot_lead")).toMatchObject({ total: 0, owesReply: 0, unassigned: 0, pendingFollowUp: 0 });
    expect(of("perdido").total).toBe(1);
  });

  it("conta total, sem resposta, sem responsável e follow-up pendente", () => {
    expect(of("lead_entrou")).toMatchObject({ total: 2, owesReply: 1, unassigned: 1, pendingFollowUp: 0 });
    expect(of("agendado")).toMatchObject({ total: 1, owesReply: 1, unassigned: 0, pendingFollowUp: 1 });
  });
});

describe("contactRows", () => {
  const leads = [lead("a", "lead_entrou"), lead("b", "hot_lead"), lead("c", "hot_lead"), lead("d", "agendado")];
  const convs = [
    conv("ca", "a", { lastMessageAt: ago(30) }),                              // deve, 30m
    conv("cb", "b", { lastMessageAt: ago(600), assignedTo: "u1" }),           // deve, 10h
    conv("cc", "c", { lastMessageAt: ago(5), awaitingReply: true }),          // espera a paciente
    conv("cd", "d", { lastMessageAt: ago(9000), status: "closed" }),          // fechada
  ];

  it("'Sem resposta': só quem a clínica deve, quem espera há mais tempo primeiro", () => {
    expect(contactRows(leads, convs, "owes", NOW).map(r => r.leadId)).toEqual(["b", "a"]);
  });

  it("'Abertas': todas as abertas, mais recentes primeiro; fechadas ficam de fora", () => {
    expect(contactRows(leads, convs, "open", NOW).map(r => r.leadId)).toEqual(["c", "a", "b"]);
  });

  it("'Sem responsável': abertas sem ninguém atribuído", () => {
    expect(contactRows(leads, convs, "unassigned", NOW).map(r => r.leadId).sort()).toEqual(["a", "c"]);
  });

  it("filtro de etapa (clique no cartão) vale para lista e contagens", () => {
    expect(contactRows(leads, convs, "owes", NOW, "hot_lead").map(r => r.leadId)).toEqual(["b"]);
    expect(contactCounts(leads, convs, NOW, "hot_lead")).toEqual({ owes: 1, open: 2, unassigned: 1 });
  });

  it("minutos de espera vêm prontos para a tela", () => {
    const b = contactRows(leads, convs, "owes", NOW)[0];
    expect(b).toMatchObject({ leadId: "b", minutes: 600, owesReply: true });
  });

  it("conversa de lead que não existe mais é ignorada", () => {
    expect(contactRows([], convs, "open", NOW)).toEqual([]);
  });
});

describe("teamLoad", () => {
  const members = [
    { userId: "u1", displayName: "Carolina" },
    { userId: "u2", displayName: "Beatriz" },
    { userId: "u3", displayName: "Ana" },
  ];
  const convs = [
    conv("1", "x", { assignedTo: "u2", lastMessageAt: ago(90) }),
    conv("2", "y", { assignedTo: "u2", lastMessageAt: ago(20) }),
    conv("3", "z", { assignedTo: "u1", awaitingReply: true }),
    conv("4", "w", { assignedTo: "u1", status: "closed" }),
  ];
  const load = teamLoad(members, convs, NOW);

  it("quem tem mais pacientes esperando aparece primeiro", () => {
    expect(load.map(m => m.displayName)).toEqual(["Beatriz", "Carolina", "Ana"]);
  });

  it("conta atribuídas abertas, sem resposta e a espera mais antiga", () => {
    expect(load[0]).toMatchObject({ assigned: 2, owes: 2, longestWait: 90 });
    expect(load[1]).toMatchObject({ assigned: 1, owes: 0, longestWait: null });
  });
});
