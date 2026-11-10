import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@/lib/db";
import { can, type Permission, type Role } from "@/lib/permissions";

const SESSION_COOKIE = "vivamed_session";
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 12;

export type CurrentUser = { id: string; name: string; email: string | null; role: Role };

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  // Pulizia opportunistica delle sessioni scadute.
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // In intranet l'app gira spesso in http: il flag Secure va attivato solo
    // quando è servita in https, altrimenti il browser scarta il cookie.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Utente della richiesta corrente, o null. Deduplicato per singola richiesta. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  const { id, name, email, role } = session.user;
  return { id, name, email, role };
});

/** Per pagine e layout: senza sessione si va al login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Per pagine: senza il permesso la pagina "non esiste". */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) notFound();
  return user;
}

export { SESSION_COOKIE };
