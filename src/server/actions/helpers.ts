import "server-only";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { t } from "@/lib/messages";
import type { ActionState } from "@/lib/validation";

/**
 * Ogni Server Action è un endpoint pubblico: rileggiamo sempre la sessione e
 * controlliamo il permesso qui, senza fidarci di ciò che mostra l'interfaccia.
 */
export async function authorize(
  permission: Permission,
): Promise<{ user: CurrentUser; denied?: undefined } | { user?: undefined; denied: ActionState }> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, permission)) return { denied: { error: t.errors.forbidden } };
  return { user };
}

export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
