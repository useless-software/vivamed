import type { Metadata } from "next";
import { Suspense } from "react";
import { AgendaLoader } from "@/components/agenda/agenda-loader";
import type { AgendaEvent } from "@/components/agenda/types";
import { PageLoading } from "@/components/page-loading";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.agenda.title };

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AgendaContent searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Il giorno mostrato lo decide il browser (che conosce il fuso dell'utente).
 * Il server carica una finestra più larga attorno a quella data, così la
 * settimana visibile è sempre coperta qualunque sia il fuso orario.
 */
function loadingWindow(dateParam: string | undefined): { from: Date; to: Date } {
  const requested =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? Date.parse(`${dateParam}T12:00:00Z`) : NaN;
  const anchor = Number.isNaN(requested) ? Date.now() : requested;
  return { from: new Date(anchor - 8 * DAY_MS), to: new Date(anchor + 8 * DAY_MS) };
}

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

async function AgendaContent({ searchParams }: Pick<PageProps<"/agenda">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;

  const dateParam = one(params.data);
  const { from, to } = loadingWindow(dateParam);

  // Un medico parte dalla propria agenda; "tutti" mostra quella dell'intero studio.
  const doctorParam = one(params.medico) ?? (user.role === "DOCTOR" ? user.id : "tutti");
  const patientParam = one(params.paziente);

  const [appointments, doctors, rooms, preselected] = await Promise.all([
    db.appointment.findMany({
      where: {
        startsAt: { lt: to },
        endsAt: { gt: from },
        doctorId: doctorParam === "tutti" ? undefined : doctorParam,
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        outcome: true,
        reason: true,
        doctorId: true,
        roomId: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.user.findMany({
      where: { role: "DOCTOR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true, active: true },
    }),
    db.room.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, active: true, doctors: { select: { id: true } } },
    }),
    patientParam
      ? db.patient.findUnique({
          where: { id: patientParam },
          select: { id: true, firstName: true, lastName: true },
        })
      : null,
  ]);

  const events: AgendaEvent[] = appointments.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    outcome: a.outcome,
    reason: a.reason,
    doctorId: a.doctorId,
    roomId: a.roomId,
    patient: { id: a.patient.id, label: `${a.patient.lastName} ${a.patient.firstName}` },
  }));

  return (
    <AgendaLoader
      events={events}
      doctors={doctors}
      rooms={rooms}
      user={{ id: user.id, role: user.role }}
      doctorFilter={doctorParam}
      date={dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null}
      preselectedPatient={
        preselected
          ? { id: preselected.id, label: `${preselected.lastName} ${preselected.firstName}` }
          : null
      }
    />
  );
}
