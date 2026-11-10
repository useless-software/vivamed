import { describe, expect, it } from "vitest";
import { isActiveReminder, parseArchiveSize, parseWindow, reminderBounds } from "@/lib/reminders";

// Martedì 10 novembre 2026, ore 10:00 in Italia.
const now = new Date("2026-11-10T09:00:00.000Z");
const at = (iso: string) => new Date(iso);
const sent = at("2026-11-09T10:00:00.000Z");

describe("sezione promemoria", () => {
  it("la finestra di 1 giorno comprende oggi e domani, fino a mezzanotte", () => {
    const bounds = reminderBounds(now, 1);
    expect(bounds.until.toISOString()).toBe("2026-11-11T23:00:00.000Z");
    expect(bounds.archiveFrom.toISOString()).toBe("2026-11-10T23:00:00.000Z");
  });

  it("mostra gli appuntamenti futuri nella finestra, non quelli passati, oltre o disdetti", () => {
    const bounds = reminderBounds(now, 1);
    const base = { reminderSentAt: null, status: "PENDING" };
    expect(isActiveReminder({ ...base, startsAt: at("2026-11-11T08:00:00.000Z") }, bounds)).toBe(true);
    expect(isActiveReminder({ ...base, startsAt: at("2026-11-10T08:00:00.000Z") }, bounds)).toBe(false);
    expect(isActiveReminder({ ...base, startsAt: at("2026-11-12T08:00:00.000Z") }, bounds)).toBe(false);
    expect(
      isActiveReminder({ ...base, status: "CANCELLED", startsAt: at("2026-11-11T08:00:00.000Z") }, bounds),
    ).toBe(false);
  });

  it("un promemoria inviato resta fino al giorno dell'appuntamento, poi va in archivio", () => {
    const bounds = reminderBounds(now, 7);
    // Appuntamento domani, già avvisato: ancora in elenco (grigio).
    expect(
      isActiveReminder({ status: "CONFIRMED", reminderSentAt: sent, startsAt: at("2026-11-11T08:00:00.000Z") }, bounds),
    ).toBe(true);
    // Appuntamento oggi pomeriggio, già avvisato: archiviato.
    expect(
      isActiveReminder({ status: "CONFIRMED", reminderSentAt: sent, startsAt: at("2026-11-10T15:00:00.000Z") }, bounds),
    ).toBe(false);
    // Appuntamento oggi pomeriggio, non ancora avvisato: resta, si può ancora mandare.
    expect(
      isActiveReminder({ status: "PENDING", reminderSentAt: null, startsAt: at("2026-11-10T15:00:00.000Z") }, bounds),
    ).toBe(true);
  });

  it("accetta solo i filtri previsti", () => {
    expect(parseWindow("14")).toBe(14);
    expect(parseWindow("3")).toBe(7);
    expect(parseArchiveSize("50")).toBe(50);
    expect(parseArchiveSize("abc")).toBe(10);
  });
});
