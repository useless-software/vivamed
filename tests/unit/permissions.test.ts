import { describe, expect, it } from "vitest";
import { can, canWriteAppointment } from "@/lib/permissions";

describe("permessi per ruolo", () => {
  it("solo l'amministratore gestisce utenti e sale", () => {
    expect(can("ADMIN", "users.manage")).toBe(true);
    expect(can("ADMIN", "rooms.manage")).toBe(true);
    for (const role of ["RECEPTION", "DOCTOR"] as const) {
      expect(can(role, "users.manage")).toBe(false);
      expect(can(role, "rooms.manage")).toBe(false);
    }
  });

  it("tutti i ruoli consultano e modificano i pazienti e vedono l'agenda", () => {
    for (const role of ["ADMIN", "RECEPTION", "DOCTOR"] as const) {
      expect(can(role, "patients.read")).toBe(true);
      expect(can(role, "patients.write")).toBe(true);
      expect(can(role, "appointments.read")).toBe(true);
    }
  });

  it("reception e amministratore gestiscono gli appuntamenti di chiunque", () => {
    expect(canWriteAppointment({ id: "u1", role: "RECEPTION" }, "doc")).toBe(true);
    expect(canWriteAppointment({ id: "u1", role: "ADMIN" }, "doc")).toBe(true);
  });

  it("il medico gestisce solo i propri appuntamenti", () => {
    expect(canWriteAppointment({ id: "doc", role: "DOCTOR" }, "doc")).toBe(true);
    expect(canWriteAppointment({ id: "doc", role: "DOCTOR" }, "altro")).toBe(false);
    expect(canWriteAppointment({ id: "doc", role: "DOCTOR" }, "")).toBe(false);
  });
});
