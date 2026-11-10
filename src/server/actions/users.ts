"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { t } from "@/lib/messages";
import { createUserSchema, invalid, updateUserSchema, type ActionState } from "@/lib/validation";
import { authorize, formToObject } from "./helpers";

const emailTaken: ActionState = { error: t.errors.emailTaken, fieldErrors: { email: [t.errors.emailTaken] } };

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("users.manage");
  if (auth.denied) return auth.denied;

  const parsed = createUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, role, title, password } = parsed.data;

  try {
    await db.user.create({
      data: {
        name,
        email,
        role,
        title: role === "DOCTOR" ? title : "NONE",
        // Senza email non si accede: la password non servirebbe.
        passwordHash: email && password ? await hashPassword(password) : null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return emailTaken;
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("users.manage");
  if (auth.denied) return auth.denied;

  const parsed = updateUserSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, email, role, title, active, password } = parsed.data;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: t.errors.notFound };

  // Con l'email serve una password: quella nuova o quella già impostata.
  if (email && !password && !target.passwordHash) {
    return { error: t.errors.passwordForLogin, fieldErrors: { password: [t.errors.passwordForLogin] } };
  }

  const losesAdmin = target.role === "ADMIN" && target.active && (role !== "ADMIN" || !active);
  if (losesAdmin) {
    // Un amministratore non può togliersi i poteri da solo, e ne deve restare sempre uno.
    if (target.id === auth.user.id) return { error: t.errors.selfDeactivate };
    const otherAdmins = await db.user.count({
      where: { role: "ADMIN", active: true, id: { not: id } },
    });
    if (otherAdmins === 0) return { error: t.errors.lastAdmin };
  }

  // Togliere l'email significa togliere l'accesso: via anche la password.
  const passwordHash = !email ? null : password ? await hashPassword(password) : undefined;

  try {
    await db.user.update({
      where: { id },
      data: { name, email, role, active, title: role === "DOCTOR" ? title : "NONE", passwordHash },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return emailTaken;
    throw error;
  }

  // Account disattivato, accesso tolto o password reimpostata: le sue sessioni aperte vengono chiuse.
  if (!active || !email || (password && id !== auth.user.id)) {
    await db.session.deleteMany({ where: { userId: id } });
  }
  refresh();
  return { ok: true };
}
