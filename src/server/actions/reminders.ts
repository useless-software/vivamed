"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { canWriteAppointment } from "@/lib/permissions";
import type { ActionState } from "@/lib/validation";

/** Segna (o toglie) il promemoria come inviato al paziente. */
export async function setReminderSent(id: string, sent: boolean): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const appointment = await db.appointment.findUnique({ where: { id: String(id) }, select: { doctorId: true } });
  if (!appointment) return { error: t.errors.notFound };
  if (!canWriteAppointment(user, appointment.doctorId)) return { error: t.errors.ownAppointmentsOnly };

  await db.appointment.update({
    where: { id: String(id) },
    data: { reminderSentAt: sent ? new Date() : null },
  });
  refresh();
  return { ok: true };
}
