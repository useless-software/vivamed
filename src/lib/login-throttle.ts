// Freno ai tentativi di login: dopo 5 errori consecutivi sulla stessa email
// l'accesso resta bloccato per 5 minuti. Lo stato vive in memoria (vivamed gira
// come singolo processo); al riavvio si azzera.

const MAX_FAILURES = 5;
const LOCK_MS = 5 * 60 * 1000;

type Entry = { failures: number; lockedUntil: number };
const attempts = new Map<string, Entry>();

export function isLocked(email: string, now = Date.now()): boolean {
  const entry = attempts.get(email);
  if (!entry) return false;
  if (entry.lockedUntil > now) return true;
  if (entry.lockedUntil !== 0) attempts.delete(email);
  return false;
}

export function registerFailure(email: string, now = Date.now()): void {
  const entry = attempts.get(email) ?? { failures: 0, lockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.failures = 0;
    entry.lockedUntil = now + LOCK_MS;
  }
  attempts.set(email, entry);
  // Evita che la mappa cresca senza limite se qualcuno prova email a caso.
  if (attempts.size > 10_000) attempts.clear();
}

export function clearFailures(email: string): void {
  attempts.delete(email);
}
