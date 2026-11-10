// Quali appuntamenti compaiono nella sezione Promemoria. Modulo puro (testato).
import { addDaysToKey, dayKey, startOfZonedDay } from "@/lib/format";

/** Finestre selezionabili, in giorni a partire da oggi. */
export const REMINDER_WINDOWS = [1, 2, 7, 14, 30] as const;
export type ReminderWindow = (typeof REMINDER_WINDOWS)[number];

export const ARCHIVE_SIZES = [10, 25, 50] as const;
export type ArchiveSize = (typeof ARCHIVE_SIZES)[number];

export function parseWindow(value: unknown): ReminderWindow {
  const number = Number(value);
  return REMINDER_WINDOWS.includes(number as ReminderWindow) ? (number as ReminderWindow) : 7;
}

export function parseArchiveSize(value: unknown): ArchiveSize {
  const number = Number(value);
  return ARCHIVE_SIZES.includes(number as ArchiveSize) ? (number as ArchiveSize) : 10;
}

/**
 * Limiti temporali della sezione, nel fuso dello studio:
 * - `until`: fine dell'ultimo giorno della finestra ("entro 1 giorno" = oggi e domani);
 * - `archiveFrom`: inizio di domani. Un promemoria già inviato resta in elenco
 *   (grigio) fino al giorno dell'appuntamento; da quel giorno passa in "Archiviati".
 */
export function reminderBounds(now: Date, days: ReminderWindow) {
  const today = dayKey(now);
  return {
    now,
    until: startOfZonedDay(addDaysToKey(today, days + 1)),
    archiveFrom: startOfZonedDay(addDaysToKey(today, 1)),
  };
}

/** Un appuntamento è "attivo" nella lista promemoria? */
export function isActiveReminder(
  appointment: { startsAt: Date; reminderSentAt: Date | null; status: string },
  bounds: ReturnType<typeof reminderBounds>,
): boolean {
  if (appointment.status === "CANCELLED") return false;
  if (appointment.startsAt < bounds.now || appointment.startsAt >= bounds.until) return false;
  return appointment.reminderSentAt === null || appointment.startsAt >= bounds.archiveFrom;
}
