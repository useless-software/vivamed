"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { invalid, roomSchema, type ActionState } from "@/lib/validation";
import { isUniqueViolation } from "@/lib/db-errors";
import { authorize, formToObject } from "./helpers";

/** Crea una sala, o la aggiorna se il form contiene `id`. */
export async function saveRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("rooms.manage");
  if (auth.denied) return auth.denied;

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  // Una sala nuova nasce attiva: il form di creazione non ha la casella.
  const parsed = roomSchema.safeParse(id ? raw : { ...raw, active: "on" });
  if (!parsed.success) return invalid(parsed.error);

  try {
    if (id) {
      await db.room.update({ where: { id }, data: parsed.data });
    } else {
      await db.room.create({ data: parsed.data });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: t.errors.roomNameTaken, fieldErrors: { name: [t.errors.roomNameTaken] } };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}
