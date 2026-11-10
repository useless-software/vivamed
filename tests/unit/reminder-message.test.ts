import { describe, expect, it } from "vitest";
import { doctorInSentence } from "@/lib/doctors";
import { DEFAULT_REMINDER_TEMPLATE, renderReminder, SAMPLE_REMINDER_VALUES } from "@/lib/reminder-message";

describe("testo del promemoria", () => {
  it("compila il testo predefinito", () => {
    expect(renderReminder(DEFAULT_REMINDER_TEMPLATE, SAMPLE_REMINDER_VALUES)).toBe(
      "Gentile Mario Rossi, desideriamo ricordarle la sua visita con la dott.ssa Elena Verdi il giorno 10 novembre 2026. " +
        'Per confermare l\'appuntamento, scriva "Confermo". ' +
        "Per disdire o modificare questo appuntamento, la preghiamo di contattarci. Grazie.",
    );
  });

  it("sostituisce ogni occorrenza e lascia intatti i segnaposto sconosciuti", () => {
    expect(renderReminder("{nome} {nome} alle {ora} in {sala} {boh}", SAMPLE_REMINDER_VALUES)).toBe(
      "Mario Mario alle 09:30 in Ambulatorio 1 {boh}",
    );
  });

  it("usa l'articolo giusto per ogni titolo", () => {
    expect(doctorInSentence("DOTT", "Marco Rossi")).toBe("il dott. Marco Rossi");
    expect(doctorInSentence("DOTT_SSA", "Elena Verdi")).toBe("la dott.ssa Elena Verdi");
    expect(doctorInSentence("PROF", "Luigi Neri")).toBe("il prof. Luigi Neri");
    expect(doctorInSentence("PROF_SSA", "Anna Blu")).toBe("la prof.ssa Anna Blu");
    expect(doctorInSentence("NONE", "Paolo Gialli")).toBe("Paolo Gialli");
  });
});
