import { describe, expect, it } from "vitest";
import { detectSeason, themeScript } from "@/lib/seasons";

describe("temi delle feste", () => {
  it("riconosce le feste a data fissa", () => {
    expect(detectSeason(2026, 12, 25)).toBe("natale");
    expect(detectSeason(2026, 12, 8)).toBe("natale");
    expect(detectSeason(2027, 1, 6)).toBe("natale");
    expect(detectSeason(2027, 1, 7)).toBeNull();
    expect(detectSeason(2026, 12, 31)).toBe("capodanno");
    expect(detectSeason(2027, 1, 1)).toBe("capodanno");
    expect(detectSeason(2026, 10, 31)).toBe("halloween");
    expect(detectSeason(2026, 11, 1)).toBe("halloween");
    expect(detectSeason(2026, 11, 2)).toBeNull();
    expect(detectSeason(2026, 2, 14)).toBe("san-valentino");
    expect(detectSeason(2027, 2, 13)).toBeNull();
    expect(detectSeason(2026, 6, 2)).toBe("festa-repubblica");
  });

  it("calcola Pasqua e Carnevale (date mobili)", () => {
    // Pasqua 2026: 5 aprile. Martedì grasso: 17 febbraio.
    expect(detectSeason(2026, 4, 5)).toBe("pasqua");
    expect(detectSeason(2026, 4, 3)).toBe("pasqua");
    expect(detectSeason(2026, 4, 6)).toBe("pasqua");
    expect(detectSeason(2026, 4, 7)).toBeNull();
    expect(detectSeason(2026, 2, 17)).toBe("carnevale");
    expect(detectSeason(2026, 2, 12)).toBe("carnevale");
    expect(detectSeason(2026, 2, 18)).toBeNull();
    // Pasqua 2027: 28 marzo; 2025: 20 aprile.
    expect(detectSeason(2027, 3, 28)).toBe("pasqua");
    expect(detectSeason(2025, 4, 20)).toBe("pasqua");
  });

  it("lo script per il <head> contiene la funzione completa e funziona da solo", () => {
    const html = { attrs: {} as Record<string, string> };
    const fakeDocument = { documentElement: { setAttribute: (k: string, v: string) => (html.attrs[k] = v) } };
    const run = new Function("document", "localStorage", "location", "Date", themeScript);
    const FixedDate = class extends Date {
      constructor() {
        super(2026, 11, 24);
      }
    };
    run(fakeDocument, { getItem: () => null }, { search: "" }, FixedDate);
    expect(html.attrs["data-season"]).toBe("natale");
  });
});
