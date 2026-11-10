import { describe, expect, it } from "vitest";
import { clearFailures, isLocked, registerFailure } from "@/lib/login-throttle";

const MINUTE = 60 * 1000;

describe("freno ai tentativi di login", () => {
  it("blocca dopo 5 errori e sblocca dopo 5 minuti", () => {
    const email = "blocco@studio.test";
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) registerFailure(email, now);
    expect(isLocked(email, now)).toBe(false);
    registerFailure(email, now);
    expect(isLocked(email, now)).toBe(true);
    expect(isLocked(email, now + 4 * MINUTE)).toBe(true);
    expect(isLocked(email, now + 5 * MINUTE + 1)).toBe(false);
  });

  it("un login riuscito azzera il conteggio", () => {
    const email = "ok@studio.test";
    for (let i = 0; i < 4; i++) registerFailure(email);
    clearFailures(email);
    registerFailure(email);
    expect(isLocked(email)).toBe(false);
  });

  it("il blocco riguarda solo l'email interessata", () => {
    for (let i = 0; i < 5; i++) registerFailure("a@studio.test");
    expect(isLocked("a@studio.test")).toBe(true);
    expect(isLocked("b@studio.test")).toBe(false);
  });
});
