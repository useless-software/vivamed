// Schemi di validazione condivisi dalle Server Actions. Modulo puro.
import { z } from "zod";
import { isValidFiscalCode } from "@/lib/codice-fiscale";
import { t } from "@/lib/messages";

const required = (max = 200) => z.string().trim().min(1, t.errors.required).max(max);

/** Stringa facoltativa: "" e spazi diventano null. */
const optional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const email = z.string().trim().toLowerCase().pipe(z.email(t.errors.email));
const password = z.string().min(8, t.errors.passwordShort).max(200);
// Una casella non spuntata non viene inviata affatto dal browser: campo assente = false.
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const roleSchema = z.enum(["ADMIN", "RECEPTION", "DOCTOR"]);
export const statusSchema = z.enum(["PENDING", "CONFIRMED", "CANCELLED"]);
export const titleSchema = z.enum(["NONE", "DOTT", "DOTT_SSA", "PROF", "PROF_SSA"]);
/** Esito della visita: "" o assente = non indicato. */
export const outcomeSchema = z
  .enum(["", "COMPLETED", "NO_SHOW"])
  .optional()
  .transform((value) => (value ? value : null));

/** Email facoltativa: "" diventa null. */
const optionalEmail = z
  .union([z.literal(""), email])
  .optional()
  .transform((value) => (value ? value : null));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, t.errors.required),
});

export const setupSchema = z
  .object({ name: required(120), email, password, passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: t.errors.passwordMismatch,
  });

const userFields = {
  name: required(120),
  email: optionalEmail,
  role: roleSchema,
  title: titleSchema.default("NONE"),
  // Vuota = nessuna password (in modifica: non cambiarla).
  password: z.union([z.literal(""), password]).optional().transform((value) => value || null),
};

/** Admin e reception devono poter accedere: per loro l'email è obbligatoria. */
function requireEmailUnlessDoctor(data: { role: string; email: string | null }, ctx: z.RefinementCtx) {
  if (data.role !== "DOCTOR" && !data.email) {
    ctx.addIssue({ code: "custom", path: ["email"], message: t.errors.emailRequired });
  }
}

export const createUserSchema = z.object(userFields).superRefine((data, ctx) => {
  requireEmailUnlessDoctor(data, ctx);
  if (data.email && !data.password) {
    ctx.addIssue({ code: "custom", path: ["password"], message: t.errors.passwordForLogin });
  }
});

// In modifica la password può mancare se l'utente ne ha già una: lo verifica la Server Action.
export const updateUserSchema = z
  .object({ ...userFields, id: required(), active: checkbox })
  .superRefine(requireEmailUnlessDoctor);

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, t.errors.required), password, passwordConfirm: z.string() })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: t.errors.passwordMismatch,
  });

export const roomSchema = z.object({
  name: required(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t.errors.color),
  active: checkbox,
  doctorIds: z.array(z.string().min(1)).max(100).default([]),
});

const birthDate = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(NaN);
    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1900) {
      ctx.addIssue({ code: "custom", message: t.errors.date });
      return z.NEVER;
    }
    if (date.getTime() > Date.now()) {
      ctx.addIssue({ code: "custom", message: t.errors.birthDateFuture });
      return z.NEVER;
    }
    return date;
  });

export const patientSchema = z.object({
  firstName: required(80),
  lastName: required(80),
  fiscalCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || isValidFiscalCode(value), t.errors.fiscalCode)
    .transform((value) => (value === "" ? null : value)),
  sex: z
    .enum(["", "M", "F"])
    .optional()
    .transform((value) => (value ? value : null)),
  birthDate,
  birthPlace: optional(120),
  birthPlaceCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .refine((value) => !value || /^[A-Z]\d{3}$/.test(value), t.errors.birthPlaceCode)
    .transform((value) => (value ? value : null)),
  phone: optional(40),
  email: z.union([z.literal(""), email]).transform((value) => (value === "" ? null : value)),
  address: optional(200),
  notes: optional(5000),
});

const MAX_APPOINTMENT_MS = 12 * 60 * 60 * 1000;

const timeRange = <T extends { startsAt: Date; endsAt: Date }>(data: T, ctx: z.RefinementCtx) => {
  // Se una delle due date non è valida l'errore è già stato segnalato sul campo.
  if (!(data.startsAt instanceof Date) || !(data.endsAt instanceof Date)) return;
  const duration = data.endsAt.getTime() - data.startsAt.getTime();
  if (duration <= 0) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: t.errors.timeOrder });
  } else if (duration > MAX_APPOINTMENT_MS) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: t.errors.tooLong });
  }
};

// Le date arrivano dal browser come stringhe ISO complete di fuso orario.
const isoDate = z.iso.datetime({ offset: true, error: t.errors.date }).transform((value) => new Date(value));

export const appointmentSchema = z
  .object({
    patientId: z.string().min(1, t.errors.patientInvalid),
    doctorId: z.string().min(1, t.errors.doctorInvalid),
    roomId: z.string().min(1, t.errors.roomInvalid),
    startsAt: isoDate,
    endsAt: isoDate,
    reason: optional(500),
    status: statusSchema.default("PENDING"),
    outcome: outcomeSchema,
  })
  .superRefine(timeRange);

export const moveAppointmentSchema = z
  .object({
    id: z.string().min(1),
    startsAt: isoDate,
    endsAt: isoDate,
    doctorId: z.string().min(1).optional(),
    roomId: z.string().min(1).optional(),
  })
  .superRefine(timeRange);

export type FieldErrors = Record<string, string[] | undefined>;

/** Stato restituito dalle Server Actions ai form. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  /** Elemento appena creato, per chi deve selezionarlo subito (es. nuovo paziente dal form appuntamento). */
  created?: { id: string; label: string };
};

export function invalid(error: z.ZodError): ActionState {
  return { error: t.errors.invalid, fieldErrors: z.flattenError(error).fieldErrors as FieldErrors };
}

const MAX_STOP_MS = 24 * 60 * 60 * 1000;

/** "Stop" in agenda: un commento che blocca la sala (e i medici indicati) per un intervallo. */
export const stopSchema = z
  .object({
    note: required(300),
    roomId: z.string().min(1, t.errors.roomInvalid),
    startsAt: isoDate,
    endsAt: isoDate,
    doctorIds: z.array(z.string().min(1)).max(50).default([]),
  })
  .superRefine((data, ctx) => {
    if (!(data.startsAt instanceof Date) || !(data.endsAt instanceof Date)) return;
    const duration = data.endsAt.getTime() - data.startsAt.getTime();
    if (duration <= 0) ctx.addIssue({ code: "custom", path: ["endsAt"], message: t.errors.timeOrder });
    else if (duration > MAX_STOP_MS) ctx.addIssue({ code: "custom", path: ["endsAt"], message: t.errors.stopTooLong });
  });
