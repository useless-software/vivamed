// Testo del promemoria da mandare al paziente (es. su WhatsApp). Modulo puro.

export const DEFAULT_REMINDER_TEMPLATE =
  "Gentile {paziente}, desideriamo ricordarle la sua visita con {medico} il giorno {data}. " +
  'Per confermare l\'appuntamento, scriva "Confermo". ' +
  "Per disdire o modificare questo appuntamento, la preghiamo di contattarci. Grazie.";

/** Segnaposto disponibili nel testo, con la descrizione mostrata nelle impostazioni. */
export const REMINDER_PLACEHOLDERS = {
  paziente: "Nome e cognome del paziente",
  nome: "Solo il nome del paziente",
  medico: "Il medico con titolo (es. \"il dott. Marco Rossi\")",
  data: "Giorno della visita (es. \"10 novembre 2026\")",
  giorno: "Giorno con il nome della settimana (es. \"martedì 10 novembre 2026\")",
  ora: "Orario della visita (es. \"09:30\")",
  sala: "Nome della sala",
} as const;

export type ReminderValues = Record<keyof typeof REMINDER_PLACEHOLDERS, string>;

/** Sostituisce i segnaposto {nome}; quelli sconosciuti restano come sono. */
export function renderReminder(template: string, values: ReminderValues): string {
  return template.replace(/\{([a-z]+)\}/g, (match, key: string) =>
    key in values ? values[key as keyof ReminderValues] : match,
  );
}

/** Dati di esempio per l'anteprima nelle impostazioni. */
export const SAMPLE_REMINDER_VALUES: ReminderValues = {
  paziente: "Mario Rossi",
  nome: "Mario",
  medico: "la dott.ssa Elena Verdi",
  data: "10 novembre 2026",
  giorno: "martedì 10 novembre 2026",
  ora: "09:30",
  sala: "Ambulatorio 1",
};
