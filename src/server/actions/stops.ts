"use server";

import { refresh } from "next/cache";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { can, canWriteAppointment } from "@/lib/permissions";
import { invalid, stopSchema, type ActionState } from "@/lib/validation";
import { formToObject } from "./helpers";

type StopData = { note: string; roomId: string; startsAt: Date; endsAt: Date; doctorIds: string[] };

/**
 * Chi può gestire uno stop: reception e amministratore sempre; il medico solo
 * se lo stop riguarda soltanto lui.
 */
function canManageStop(user: CurrentUser, doctorIds: string[]): boolean {
  if (can(user.role, "appointments.writeAll")) return true;
  return doctorIds.length > 0 && doctorIds.every((id) => canWriteAppointment(user, id));
}

async function persist(user: CurrentUser, id: string | null, data: StopData): Promise<ActionState> {
  if (!canManageStop(user, data.doctorIds)) return { error: t.errors.ownAppointmentsOnly };

  const room = await db.room.findUnique({ where: { id: data.roomId }, select: { id: true } });
  if (!room) return { error: t.errors.roomInvalid, fieldErrors: { roomId: [t.errors.roomInvalid] } };
  const doctors = await db.user.findMany({
    where: { id: { in: data.doctorIds }, role: "DOCTOR" },
    select: { id: true },
  });

  // Uno stop non può coprire visite già prenotate nella sala o con quei medici.
  const clashes = await db.appointment.count({
    where: {
      status: { not: "CANCELLED" },
      startsAt: { lt: data.endsAt },
      endsAt: { gt: data.startsAt },
      OR: [{ roomId: data.roomId }, { doctorId: { in: doctors.map((doctor) => doctor.id) } }],
    },
  });
  if (clashes > 0) return { error: t.errors.stopOverAppointments(clashes) };

  const fields = { note: data.note, roomId: data.roomId, startsAt: data.startsAt, endsAt: data.endsAt };
  const connect = doctors.map((doctor) => ({ id: doctor.id }));
  if (id) {
    await db.agendaStop.update({ where: { id }, data: { ...fields, doctors: { set: connect } } });
  } else {
    await db.agendaStop.create({ data: { ...fields, createdById: user.id, doctors: { connect } } });
  }
  refresh();
  return { ok: true };
}

/** Crea uno stop, o lo aggiorna se il form contiene `id`. */
export async function saveStop(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  const parsed = stopSchema.safeParse({
    ...raw,
    doctorIds: formData.getAll("doctorIds").filter((value) => typeof value === "string"),
  });
  if (!parsed.success) return invalid(parsed.error);

  if (id) {
    const existing = await db.agendaStop.findUnique({ where: { id }, select: { doctors: { select: { id: true } } } });
    if (!existing) return { error: t.errors.notFound };
    if (!canManageStop(user, existing.doctors.map((doctor) => doctor.id))) {
      return { error: t.errors.ownAppointmentsOnly };
    }
  }
  return persist(user, id, parsed.data);
}

/** Spostamento o ridimensionamento col trascinamento nel calendario. */
export async function moveStop(input: {
  id: string;
  startsAt: string;
  endsAt: string;
  roomId?: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const existing = await db.agendaStop.findUnique({
    where: { id: String(input.id) },
    include: { doctors: { select: { id: true } } },
  });
  if (!existing) return { error: t.errors.notFound };

  const doctorIds = existing.doctors.map((doctor) => doctor.id);
  const parsed = stopSchema.safeParse({
    note: existing.note,
    roomId: input.roomId ?? existing.roomId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    doctorIds,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.errors.invalid };
  return persist(user, existing.id, parsed.data);
}

export async function deleteStop(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const existing = await db.agendaStop.findUnique({
    where: { id: String(id) },
    select: { id: true, doctors: { select: { id: true } } },
  });
  if (!existing) return { error: t.errors.notFound };
  if (!canManageStop(user, existing.doctors.map((doctor) => doctor.id))) {
    return { error: t.errors.ownAppointmentsOnly };
  }
  await db.agendaStop.delete({ where: { id: existing.id } });
  refresh();
  return { ok: true };
}
