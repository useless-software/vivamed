// Formattazione di date e orari in italiano.
//
// Nel database gli orari sono istanti assoluti (timestamptz). Quando è il
// server a scriverli nella pagina serve sapere in che fuso mostrarli: quello
// dello studio, configurabile con APP_TIMEZONE.

export const timeZone = process.env.APP_TIMEZONE || "Europe/Rome";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  timeZone,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const time = new Intl.DateTimeFormat("it-IT", { timeZone, hour: "2-digit", minute: "2-digit" });

const shortDateTime = new Intl.DateTimeFormat("it-IT", {
  timeZone,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "03/02/2026, 09:30" */
export function formatDateTime(date: Date): string {
  return shortDateTime.format(date);
}

/** "lun 03/02/2026, 09:30 – 10:00" */
export function formatAppointmentRange(startsAt: Date, endsAt: Date): string {
  return `${dateTime.format(startsAt)} – ${time.format(endsAt)}`;
}

/** Data senza orario (es. data di nascita, salvata come mezzanotte UTC): "03/02/1980". */
export function formatDateOnly(date: Date | null): string {
  if (!date) return "";
  const [year, month, day] = toDateInputValue(date).split("-");
  return `${day}/${month}/${year}`;
}

/** Valore per <input type="date">: "1980-02-03". */
export function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Differenza (ms) tra l'ora locale dello studio e UTC in un certo istante. */
function zoneOffset(date: Date): number {
  const p = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Il giorno ("2026-02-03") in cui cade un istante, secondo il fuso dello studio. */
export function dayKey(date: Date): string {
  const p = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Mezzanotte locale dello studio del giorno indicato ("2026-02-03"), come istante. */
export function startOfZonedDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date);
  // Due passaggi per gestire correttamente i cambi d'ora legale.
  const first = guess - zoneOffset(new Date(guess));
  return new Date(guess - zoneOffset(new Date(first)));
}

/** Aggiunge giorni a una chiave "yyyy-mm-dd" (aritmetica di calendario, non di ore). */
export function addDaysToKey(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** Inizio e fine (esclusa) del giorno indicato nel fuso dello studio. */
export function zonedDayRange(day: string): { start: Date; end: Date } {
  return { start: startOfZonedDay(day), end: startOfZonedDay(addDaysToKey(day, 1)) };
}

export const isDayKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const longDate = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const longDateWithDay = new Intl.DateTimeFormat("it-IT", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "10 novembre 2026" (o "martedì 10 novembre 2026") per una chiave di giorno. */
export function formatDayKey(day: string, withWeekday = false): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  return (withWeekday ? longDateWithDay : longDate).format(date);
}

/** "09:30" nel fuso dello studio. */
export function formatTime(date: Date): string {
  return time.format(date);
}

/** "30 min", "1 h", "1 h 15 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
