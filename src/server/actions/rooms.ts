"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { t } from "@/lib/messages";
import { invalid, roomSchema, type ActionState } from "@/lib/validation";
import { authorize, formToObject } from "./helpers";

/** Crea una sala, o la aggiorna se il form contiene `id`. */
export async function saveRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("rooms.manage");
  if (auth.denied) return auth.denied;

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  const parsed = roomSchema.safeParse({
    ...raw,
    // Una sala nuova nasce attiva: il form di creazione non ha la casella.
    active: id ? raw.active : "on",
    // Più caselle con lo stesso nome: FormData le restituisce tutte con getAll.
    doctorIds: formData.getAll("doctorIds").filter((value) => typeof value === "string"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { doctorIds, ...room } = parsed.data;

  // Si possono assegnare solo utenti che sono davvero medici.
  const doctors = await db.user.findMany({
    where: { id: { in: doctorIds }, role: "DOCTOR" },
    select: { id: true },
  });
  const connect = doctors.map(({ id: doctorId }) => ({ id: doctorId }));

  try {
    if (id) {
      await db.room.update({ where: { id }, data: { ...room, doctors: { set: connect } } });
    } else {
      await db.room.create({ data: { ...room, doctors: { connect } } });
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
