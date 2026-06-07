import { describe, it, expect } from "vitest";
import {
  nextRecallDate, isRecallDue, daysSince, isNoReply,
} from "@/lib/reminders";

const NOW = new Date("2026-06-06T12:00:00Z");

describe("reminders helpers", () => {
  it("nextRecallDate soma o intervalo de recorrência", () => {
    const d = nextRecallDate("2026-01-01T00:00:00Z", 120);
    expect(d.toISOString().slice(0, 10)).toBe("2026-05-01");
  });

  it("isRecallDue: vencido entra; muito no futuro não entra", () => {
    // procedimento há 130 dias, recall a cada 120 -> já venceu
    expect(isRecallDue("2026-01-27T12:00:00Z", 120, 14, NOW)).toBe(true);
    // procedimento ontem, recall a cada 120 -> falta muito (fora da janela de 14d)
    expect(isRecallDue("2026-06-05T12:00:00Z", 120, 14, NOW)).toBe(false);
    // recorrência inválida nunca vence
    expect(isRecallDue("2026-01-01T12:00:00Z", 0, 14, NOW)).toBe(false);
  });

  it("isRecallDue respeita a janela de antecedência", () => {
    // vence em 10 dias: dentro da janela de 14 -> avisa; fora da janela de 7 -> ainda não
    const scheduled = "2026-02-07T12:00:00Z"; // +120d = 2026-06-07, vence em ~1 dia
    expect(isRecallDue(scheduled, 120, 14, NOW)).toBe(true);
    expect(isRecallDue("2026-04-08T12:00:00Z", 90, 7, NOW)).toBe(false); // +90d = 2026-07-07 (>7d)
  });

  it("daysSince conta dias inteiros", () => {
    expect(daysSince("2026-06-03T12:00:00Z", NOW)).toBe(3);
    expect(daysSince("2026-06-06T11:00:00Z", NOW)).toBe(0);
  });

  it("isNoReply: além do limite é true, dentro é false", () => {
    expect(isNoReply("2026-06-02T12:00:00Z", 3, NOW)).toBe(true);  // 4 dias > 3
    expect(isNoReply("2026-06-04T12:00:00Z", 3, NOW)).toBe(false); // 2 dias <= 3
  });
});
