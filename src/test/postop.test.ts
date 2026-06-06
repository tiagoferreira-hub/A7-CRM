import { describe, it, expect } from "vitest";
import { fillTemplate, postopDate } from "@/lib/postop";

describe("postop helpers", () => {
  it("fillTemplate substitui nome e procedimento", () => {
    expect(fillTemplate("Oi {nome}, como está após o {procedimento}?", { nome: "Ana", procedimento: "Botox" }))
      .toBe("Oi Ana, como está após o Botox?");
  });

  it("fillTemplate trata vazios", () => {
    expect(fillTemplate("{nome}", {})).toBe("");
    expect(fillTemplate("", { nome: "X" })).toBe("");
  });

  it("postopDate soma os dias mantendo o horário", () => {
    const base = new Date(2026, 5, 6, 14, 0).toISOString();
    const d = new Date(postopDate(base, 7));
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(14);
  });
});
