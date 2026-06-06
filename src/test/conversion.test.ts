import { describe, it, expect } from "vitest";
import { groupConversion, winRate, avgTicket, lossReasonBreakdown } from "@/lib/conversion";
import { Lead } from "@/types/lead";

const mk = (over: Partial<Lead>): Lead => ({
  id: Math.random().toString(36).slice(2),
  name: "x",
  phone: "1",
  origin: "manual",
  stage: "lead_entrou",
  service: "",
  value: 0,
  lastMessage: "",
  lastInteraction: "",
  observations: "",
  createdAt: "",
  ...over,
});

const leads: Lead[] = [
  mk({ origin: "indicacao", stage: "fechou", value: 1000 }),
  mk({ origin: "indicacao", stage: "perdido", lossReason: "Preço" }),
  mk({ origin: "meta", stage: "fechou", value: 500 }),
  mk({ origin: "meta", stage: "hot_lead" }),
  mk({ origin: "meta", stage: "perdido", lossReason: "Preço" }),
];

describe("conversion metrics", () => {
  it("groupConversion agrupa por origem com taxa e valor", () => {
    const rows = groupConversion(leads, (l) => l.origin);
    const meta = rows.find((r) => r.key === "meta")!;
    expect(meta.total).toBe(3);
    expect(meta.won).toBe(1);
    expect(meta.value).toBe(500);
    expect(Math.round(meta.rate)).toBe(33);
    const ind = rows.find((r) => r.key === "indicacao")!;
    expect(ind.rate).toBe(50);
  });

  it("winRate = ganhos / total", () => {
    expect(winRate(leads)).toBe(40); // 2 de 5
    expect(winRate([])).toBe(0);
  });

  it("avgTicket = média dos fechados", () => {
    expect(avgTicket(leads)).toBe(750); // (1000+500)/2
  });

  it("lossReasonBreakdown agrupa motivos de perda", () => {
    const lr = lossReasonBreakdown(leads);
    expect(lr[0]).toEqual({ reason: "Preço", count: 2 });
  });
});
