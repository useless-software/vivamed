"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { t } from "@/lib/messages";
import { canWriteAppointment } from "@/lib/permissions";
import {
  appointmentSchema,
  invalid,
  moveAppointmentSchema,
  statusSchema,
  type ActionState,
} from "@/lib/validation";
import type { AppointmentOutcome, AppointmentStatus } from "@/generated/prisma/client";
import { overlapViolation } from "@/lib/db-errors";
import { formToObject } from "./helpers";

type AppointmentData = {
  patientId: string;
  doctorId: string;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  status: AppointmentStatus;
  outcome: AppointmentOutcome | null;
};

/**
 * Controlli comuni a creazione, modifica e spostamento, poi scrittura.
 * `existing` è l'appuntamento prima della modifica (null se è nuovo).
 */
async function persist(
  user: CurrentUser,
  existing: { id: string; doctorId: string; roomId: string } | null,
  data: AppointmentData,
): Promise<ActionState> {
  // Un medico può toccare solo i propri appuntamenti, e non può "regalarli" ad altri.
  if (
    (existing && !canWriteAppointment(user, existing.doctorId)) ||
    !canWriteAppointment(user, data.doctorId)
  ) {
    return { error: t.errors.ownAppointmentsOnly };
  }

  const [doctor, room, patient] = await Promise.all([
    db.user.findUnique({ where: { id: data.doctorId }, select: { role: true, active: true } }),
    db.room.findUnique({ where: { id: data.roomId }, select: { active: true } }),
    db.patient.findUnique({ where: { id: data.patientId }, select: { id: true } }),
  ]);
  // Medico o sala disattivati restano validi solo se l'appuntamento li aveva già.
  const keepsDoctor = existing?.doctorId === data.doctorId;
  const keepsRoom = existing?.roomId === data.roomId;
  if (!doctor || doctor.role !== "DOCTOR" || (!doctor.active && !keepsDoctor)) {
    return { error: t.errors.doctorInvalid, fieldErrors: { doctorId: [t.errors.doctorInvalid] } };
  }
  if (!room || (!room.active && !keepsRoom)) {
    return { error: t.errors.roomInvalid, fieldErrors: { roomId: [t.errors.roomInvalid] } };
  }
  if (!patient) {
    return { error: t.errors.patientInvalid, fieldErrors: { patientId: [t.errors.patientInvalid] } };
  }

  if (data.status !== "CANCELLED") {
    // Controllo "gentile" per dare un messaggio preciso; la garanzia vera,
    // anche con richieste simultanee, è il vincolo EXCLUDE nel database.
    const clash = await db.appointment.findFirst({
      where: {
        id: existing ? { not: existing.id } : undefined,
        status: { not: "CANCELLED" },
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
        OR: [{ roomId: data.roomId }, { doctorId: data.doctorId }],
      },
      select: { roomId: true },
    });
    if (clash) {
      return { error: clash.roomId === data.roomId ? t.errors.roomBusy : t.errors.doctorBusy };
    }

    // Uno stop rende la sala (e i suoi medici) non prenotabili.
    const stop = await db.agendaStop.findFirst({
      where: {
        startsAt: { lt: data.endsAt },
        endsAt: { gt: data.startsAt },
        OR: [{ roomId: data.roomId }, { doctors: { some: { id: data.doctorId } } }],
      },
      select: { note: true },
    });
    if (stop) return { error: t.errors.stopBlocks(stop.note) };
  }

  try {
    if (existing) {
      await db.appointment.update({ where: { id: existing.id }, data });
    } else {
      await db.appointment.create({ data: { ...data, createdById: user.id } });
    }
  } catch (error) {
    const overlap = overlapViolation(error);
    if (overlap === "room") return { error: t.errors.roomBusy };
    if (overlap === "doctor") return { error: t.errors.doctorBusy };
    if (overlap) return { error: t.errors.slotBusy };
    throw error;
  }

  refresh();
  return { ok: true };
}

/** Crea un appuntamento, o lo aggiorna se il form contiene `id`. */
export async function saveAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  const parsed = appointmentSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  let existing = null;
  if (id) {
    existing = await db.appointment.findUnique({
      where: { id },
      select: { id: true, doctorId: true, roomId: true },
    });
    if (!existing) return { error: t.errors.notFound };
  }
  return persist(user, existing, parsed.data);
}

/** Spostamento o ridimensionamento col trascinamento nel calendario. */
export async function moveAppointment(input: {
  id: string;
  startsAt: string;
  endsAt: string;
  doctorId?: string;
  roomId?: string;
}): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const parsed = moveAppointmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.errors.invalid };

  const existing = await db.appointment.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { error: t.errors.notFound };

  return persist(user, existing, {
    patientId: existing.patientId,
    doctorId: parsed.data.doctorId ?? existing.doctorId,
    roomId: parsed.data.roomId ?? existing.roomId,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    reason: existing.reason,
    status: existing.status,
    outcome: existing.outcome,
  });
}

export async function setAppointmentStatus(id: string, status: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: t.errors.forbidden };

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { error: t.errors.invalid };

  const existing = await db.appointment.findUnique({ where: { id: String(id) } });
  if (!existing) return { error: t.errors.notFound };

  // Passa da `persist` così riattivare un appuntamento annullato ricontrolla le sovrapposizioni.
  return persist(user, existing, {
    patientId: existing.patientId,
    doctorId: existing.doctorId,
    roomId: existing.roomId,
    startsAt: existing.startsAt,
    endsAt: existing.endsAt,
    reason: existing.reason,
    status: parsed.data,
    outcome: existing.outcome,
  });
}
