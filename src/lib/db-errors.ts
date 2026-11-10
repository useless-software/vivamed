// Riconoscimento degli errori del database. Modulo puro, testato in tests/.

type DbError = { code?: string; message?: string; meta?: unknown; cause?: unknown };

/** Violazione di un vincolo UNIQUE (errore Prisma P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (error as DbError)?.code === "P2002";
}

/** Violazione dei vincoli EXCLUDE anti-sovrapposizione (Postgres 23P01). */
export function overlapViolation(error: unknown): "room" | "doctor" | "other" | null {
  const text = describe(error);
  if (text.includes("Appointment_room_no_overlap")) return "room";
  if (text.includes("Appointment_doctor_no_overlap")) return "doctor";
  if (text.includes("23P01")) return "other";
  return null;
}

function describe(error: unknown, depth = 0): string {
  if (!error || depth > 3) return "";
  if (typeof error === "string") return error;
  const e = error as DbError;
  let meta = "";
  try {
    meta = JSON.stringify(e.meta ?? "");
  } catch {
    // meta non serializzabile: lo ignoriamo
  }
  return `${e.code ?? ""} ${e.message ?? ""} ${meta} ${describe(e.cause, depth + 1)}`;
}
