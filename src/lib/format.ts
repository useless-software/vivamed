// Formattazione di date e orari in italiano.
//
// Nel database gli orari sono istanti assoluti (timestamptz). Quando è il
// server a scriverli nella pagina serve sapere in che fuso mostrarli: quello
// dello studio, configurabile con APP_TIMEZONE.

const timeZone = process.env.APP_TIMEZONE || "Europe/Rome";

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
