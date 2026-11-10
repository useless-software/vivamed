import { describe, expect, it } from "vitest";
import {
  appointmentSchema,
  createUserSchema,
  patientSchema,
  roomSchema,
  setupSchema,
  updateUserSchema,
} from "@/lib/validation";

const patient = {
  firstName: " Luca ",
  lastName: "Ferrari",
  fiscalCode: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

describe("paziente", () => {
  it("ripulisce gli spazi e trasforma i campi vuoti in null", () => {
    const result = patientSchema.parse(patient);
    expect(result).toEqual({
      firstName: "Luca",
      lastName: "Ferrari",
      fiscalCode: null,
      sex: null,
      birthDate: null,
      birthPlace: null,
      birthPlaceCode: null,
      phone: null,
      email: null,
      address: null,
      notes: null,
    });
  });

  it("porta il codice fiscale in maiuscolo e ne verifica il carattere di controllo", () => {
    expect(patientSchema.parse({ ...patient, fiscalCode: "rssmra85t10a562s" }).fiscalCode).toBe("RSSMRA85T10A562S");
    expect(patientSchema.safeParse({ ...patient, fiscalCode: "RSSMRA85T10A562X" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...patient, fiscalCode: "TROPPOCORTO" }).success).toBe(false);
  });

  it("accetta sesso e codice del luogo di nascita validi", () => {
    const result = patientSchema.parse({ ...patient, sex: "F", birthPlace: "Roma (RM)", birthPlaceCode: "h501" });
    expect(result).toMatchObject({ sex: "F", birthPlace: "Roma (RM)", birthPlaceCode: "H501" });
    expect(patientSchema.safeParse({ ...patient, birthPlaceCode: "ROMA" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...patient, sex: "X" }).success).toBe(false);
  });

  it("salva la data di nascita a mezzanotte UTC e rifiuta date impossibili o future", () => {
    expect(patientSchema.parse({ ...patient, birthDate: "1980-02-03" }).birthDate?.toISOString()).toBe(
      "1980-02-03T00:00:00.000Z",
    );
    expect(patientSchema.safeParse({ ...patient, birthDate: "1980-13-40" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...patient, birthDate: "2999-01-01" }).success).toBe(false);
  });

  it("richiede nome e cognome e un'email valida se presente", () => {
    expect(patientSchema.safeParse({ ...patient, firstName: "  " }).success).toBe(false);
    expect(patientSchema.safeParse({ ...patient, email: "non-una-email" }).success).toBe(false);
    expect(patientSchema.parse({ ...patient, email: "Luca@Example.com" }).email).toBe("luca@example.com");
  });
});

describe("appuntamento", () => {
  const base = {
    patientId: "p",
    doctorId: "d",
    roomId: "r",
    startsAt: "2026-02-03T09:00:00.000Z",
    endsAt: "2026-02-03T09:30:00.000Z",
    reason: "",
  };

  it("accetta un intervallo valido, con stato predefinito 'in sospeso' e nessun esito", () => {
    const result = appointmentSchema.parse(base);
    expect(result.status).toBe("PENDING");
    expect(result.outcome).toBeNull();
    expect(appointmentSchema.parse({ ...base, status: "CONFIRMED", outcome: "NO_SHOW" }).outcome).toBe("NO_SHOW");
    expect(appointmentSchema.safeParse({ ...base, status: "SCHEDULED" }).success).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(30 * 60 * 1000);
  });

  it("accetta date con fuso orario esplicito", () => {
    const result = appointmentSchema.parse({ ...base, startsAt: "2026-02-03T10:00:00+01:00" });
    expect(result.startsAt.toISOString()).toBe("2026-02-03T09:00:00.000Z");
  });

  it("rifiuta fine prima dell'inizio, durata nulla e durate oltre le 12 ore", () => {
    expect(appointmentSchema.safeParse({ ...base, endsAt: "2026-02-03T08:00:00.000Z" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...base, endsAt: "2026-02-04T09:00:00.000Z" }).success).toBe(false);
  });

  it("rifiuta date non ISO e paziente mancante", () => {
    expect(appointmentSchema.safeParse({ ...base, startsAt: "domani alle 9" }).success).toBe(false);
    expect(appointmentSchema.safeParse({ ...base, patientId: "" }).success).toBe(false);
  });
});

describe("utenti e sale", () => {
  it("la configurazione iniziale richiede password uguali di almeno 8 caratteri", () => {
    const base = { name: "Anna", email: "ANNA@studio.test", password: "password123", passwordConfirm: "password123" };
    expect(setupSchema.parse(base).email).toBe("anna@studio.test");
    expect(setupSchema.safeParse({ ...base, passwordConfirm: "diversa123" }).success).toBe(false);
    expect(setupSchema.safeParse({ ...base, password: "corta", passwordConfirm: "corta" }).success).toBe(false);
  });

  it("in modifica utente la password vuota significa 'non cambiarla'", () => {
    const base = { id: "u", name: "Anna", email: "anna@studio.test", role: "DOCTOR", password: "" };
    const result = updateUserSchema.parse(base);
    expect(result.password).toBeNull();
    // Casella "attivo" non spuntata = campo assente nel form.
    expect(result.active).toBe(false);
    expect(updateUserSchema.parse({ ...base, active: "on" }).active).toBe(true);
    expect(updateUserSchema.safeParse({ ...base, password: "corta" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, role: "SUPERUSER" }).success).toBe(false);
  });

  it("l'email è facoltativa solo per i medici; con l'email serve la password", () => {
    const base = { name: "Marco Rossi", email: "", role: "DOCTOR", title: "DOTT", password: "" };
    expect(createUserSchema.parse(base)).toMatchObject({ email: null, password: null, title: "DOTT" });
    expect(createUserSchema.safeParse({ ...base, role: "RECEPTION" }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...base, email: "rossi@studio.test" }).success).toBe(false);
    expect(
      createUserSchema.safeParse({ ...base, email: "rossi@studio.test", password: "password123" }).success,
    ).toBe(true);
    expect(updateUserSchema.safeParse({ ...base, id: "u", role: "ADMIN" }).success).toBe(false);
  });

  it("il colore della sala deve essere esadecimale", () => {
    expect(roomSchema.safeParse({ name: "Sala 1", color: "#10b981", active: "on" }).success).toBe(true);
    expect(roomSchema.safeParse({ name: "Sala 1", color: "rosso" }).success).toBe(false);
  });
});
