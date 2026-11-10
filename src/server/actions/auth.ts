"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { t } from "@/lib/messages";
import { clearFailures, isLocked, registerFailure } from "@/lib/login-throttle";
import {
  changePasswordSchema,
  invalid,
  loginSchema,
  setupSchema,
  type ActionState,
} from "@/lib/validation";
import { formToObject } from "./helpers";

// Hash usato quando l'email non esiste, così il tempo di risposta non rivela
// quali indirizzi sono registrati.
let dummyHash: Promise<string> | undefined;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: t.errors.credentials };
  const { email, password } = parsed.data;

  if (isLocked(email)) return { error: t.errors.tooManyAttempts };

  const user = await db.user.findUnique({ where: { email } });
  dummyHash ??= hashPassword("vivamed-dummy-password");
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);

  if (!user || !user.active || !valid) {
    registerFailure(email);
    return { error: t.errors.credentials };
  }

  clearFailures(email);
  await createSession(user.id);
  redirect("/agenda");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Primo avvio: crea l'amministratore. Funziona solo finché non esiste alcun utente. */
export async function setup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const userId = await db.$transaction(async (tx) => {
    // Il lock evita che due richieste contemporanee creino due amministratori.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7482913)`;
    if ((await tx.user.count()) > 0) return null;
    const user = await tx.user.create({ data: { name, email, passwordHash, role: "ADMIN" } });
    return user.id;
  });

  if (!userId) return { error: t.errors.setupDone };
  await createSession(userId);
  redirect("/agenda");
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentUser();
  if (!current) return { error: t.errors.forbidden };

  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const user = await db.user.findUnique({ where: { id: current.id } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { error: t.errors.wrongPassword, fieldErrors: { currentPassword: [t.errors.wrongPassword] } };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  // Cambiata la password, tutte le sessioni esistenti vengono chiuse e se ne apre una nuova.
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return { ok: true };
}
