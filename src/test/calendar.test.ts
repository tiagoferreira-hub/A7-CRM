import { describe, it, expect } from "vitest";
import {
  startOfWeekMonday,
  getWeekDays,
  sameDay,
  rescheduleToDay,
  combineDateTime,
  splitDateTime,
} from "@/lib/calendar";

describe("calendar helpers", () => {
  it("startOfWeekMonday volta para a segunda-feira", () => {
    // 2026-06-06 é um sábado
    const sat = new Date(2026, 5, 6);
    const mon = startOfWeekMonday(sat);
    expect(mon.getDay()).toBe(1); // segunda
    expect(mon.getDate()).toBe(1); // 2026-06-01
  });

  it("getWeekDays retorna 7 dias começando na segunda", () => {
    const days = getWeekDays(new Date(2026, 5, 6));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Seg
    expect(days[6].getDay()).toBe(0); // Dom
  });

  it("sameDay ignora horas", () => {
    expect(sameDay(new Date(2026, 5, 6, 9), new Date(2026, 5, 6, 18))).toBe(true);
    expect(sameDay(new Date(2026, 5, 6), new Date(2026, 5, 7))).toBe(false);
  });

  it("rescheduleToDay mantém o horário e troca o dia", () => {
    const iso = combineDateTime("2026-06-06", "14:30");
    const target = new Date(2026, 5, 10); // 2026-06-10
    const moved = new Date(rescheduleToDay(iso, target));
    expect(moved.getHours()).toBe(14);
    expect(moved.getMinutes()).toBe(30);
    expect(moved.getDate()).toBe(10);
  });

  it("combineDateTime + splitDateTime é round-trip", () => {
    const iso = combineDateTime("2026-06-06", "09:05");
    const parts = splitDateTime(iso);
    expect(parts.date).toBe("2026-06-06");
    expect(parts.time).toBe("09:05");
  });
});
