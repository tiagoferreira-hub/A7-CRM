import { describe, it, expect } from "vitest";
import { referrerRanking, referralSummary, referralLink } from "@/lib/referral";
import { Lead } from "@/types/lead";

const mk = (over: Partial<Lead>): Lead => ({
  id: Math.random().toString(36).slice(2),
  name: "x", phone: "1", origin: "indicacao", stage: "lead_entrou",
  service: "", value: 0, lastMessage: "", lastInteraction: "", observations: "", createdAt: "",
  ...over,
});

const leads: Lead[] = [
  mk({ id: "A", name: "Ana" }),               // indicadora
  mk({ referredByLeadId: "A", stage: "fechou", value: 800 }),
  mk({ referredByLeadId: "A", stage: "hot_lead" }),
  mk({ referredByLeadId: "B", stage: "fechou", value: 200 }),
  mk({ stage: "fechou", value: 999 }),         // sem indicador → não conta
];

describe("referral metrics", () => {
  it("referrerRanking conta indicados/ganhos/valor por indicador", () => {
    const r = referrerRanking(leads);
    const a = r.find((x) => x.referrerId === "A")!;
    expect(a.referred).toBe(2);
    expect(a.won).toBe(1);
    expect(a.value).toBe(800);
    expect(a.rate).toBe(50);
    // A vem antes de B (mais indicados)
    expect(r[0].referrerId).toBe("A");
  });

  it("referralSummary agrega o programa todo", () => {
    const s = referralSummary(leads);
    expect(s.totalReferred).toBe(3);
    expect(s.won).toBe(2);
    expect(s.value).toBe(1000);
    expect(s.activeReferrers).toBe(2);
  });

  it("referralLink monta a URL pública /indique/<ref>", () => {
    expect(referralLink("https://app.x", "A")).toBe("https://app.x/indique/A");
  });
});
