"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { t } from "@/lib/messages";
import { saveSettings as store } from "@/lib/settings";
import { invalid, type ActionState } from "@/lib/validation";
import { authorize, formToObject } from "./helpers";

const settingsSchema = z.object({
  reminderTemplate: z.string().trim().min(1, t.errors.required).max(2000),
  seasonalThemes: z.string().optional().transform((value) => value === "on"),
  confetti: z.string().optional().transform((value) => value === "on"),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("settings.manage");
  if (auth.denied) return auth.denied;

  const parsed = settingsSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await store(parsed.data);
  refresh();
  return { ok: true };
}
