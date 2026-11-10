// Schemi di validazione condivisi dalle Server Actions. Modulo puro.
import { z } from "zod";
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
export const statusSchema = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

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

export const createUserSchema = z.object({
  name: required(120),
  email,
  role: roleSchema,
  password,
});

export const updateUserSchema = z.object({
  id: required(),
  name: required(120),
  email,
  role: roleSchema,
  active: checkbox,
  // Vuota = non cambiare la password.
  password: z.union([z.literal(""), password]).optional(),
});

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
    .refine((value) => value === "" || /^[A-Z0-9]{16}$/.test(value), t.errors.fiscalCode)
    .transform((value) => (value === "" ? null : value)),
  birthDate,
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
    status: statusSchema.default("SCHEDULED"),
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
};

export function invalid(error: z.ZodError): ActionState {
  return { error: t.errors.invalid, fieldErrors: z.flattenError(error).fieldErrors as FieldErrors };
}
