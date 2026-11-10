import { describe, expect, it } from "vitest";
import { addDaysToKey, dayKey, formatDayKey, formatDuration, zonedDayRange } from "@/lib/format";

// APP_TIMEZONE non impostata nei test: si usa Europe/Rome.
describe("date nel fuso dello studio", () => {
  it("il giorno inizia alla mezzanotte italiana (ora solare e legale)", () => {
    expect(zonedDayRange("2026-01-15").start.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(zonedDayRange("2026-07-15").start.toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("il giorno del cambio d'ora dura 23 o 25 ore", () => {
    const spring = zonedDayRange("2026-03-29");
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    const autumn = zonedDayRange("2026-10-25");
    expect((autumn.end.getTime() - autumn.start.getTime()) / 3_600_000).toBe(25);
  });

  it("riconosce il giorno di un istante e somma i giorni", () => {
    expect(dayKey(new Date("2026-01-14T23:30:00.000Z"))).toBe("2026-01-15");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("scrive date e durate in italiano", () => {
    expect(formatDayKey("2026-11-10")).toBe("10 novembre 2026");
    expect(formatDayKey("2026-11-10", true)).toBe("martedì 10 novembre 2026");
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(75)).toBe("1 h 15 min");
  });
});
