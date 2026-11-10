import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorLabel } from "@/lib/doctors";
import { dayKey, formatDayKey, formatDuration, formatTime, isDayKey, zonedDayRange } from "@/lib/format";
import { t } from "@/lib/messages";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: t.print.title };

export default function PrintAgendaPage({ searchParams }: PageProps<"/agenda/stampa">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PrintAgenda searchParams={searchParams} />
    </Suspense>
  );
}

function today(): string {
  return dayKey(new Date());
}

async function PrintAgenda({ searchParams }: Pick<PageProps<"/agenda/stampa">, "searchParams">) {
  await requireUser();
  const params = await searchParams;
  const day = isDayKey(params.data) ? params.data : today();
  const doctorId = typeof params.medico === "string" && params.medico !== "tutti" ? params.medico : undefined;
  const { start, end } = zonedDayRange(day);

  const [appointments, doctor] = await Promise.all([
    db.appointment.findMany({
      where: { startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" }, doctorId },
      orderBy: [{ startsAt: "asc" }, { room: { name: "asc" } }],
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        reason: true,
        patient: { select: { firstName: true, lastName: true, phone: true } },
        doctor: { select: { name: true, title: true } },
        room: { select: { name: true } },
      },
    }),
    doctorId ? db.user.findUnique({ where: { id: doctorId }, select: { name: true, title: true } }) : null,
  ]);

  return (
    <article className="print-sheet flex flex-col gap-4 text-sm">
      <header className="flex items-start justify-between gap-4 border-b border-black pb-3">
        <div>
          <h1 className="text-xl font-semibold first-letter:uppercase">{formatDayKey(day, true)}</h1>
          <p className="text-neutral-600">
            {t.print.subtitle(appointments.length)}
            {doctor ? ` · ${doctorLabel(doctor.title, doctor.name)}` : ""}
          </p>
        </div>
        <PrintButton />
      </header>

      {appointments.length === 0 ? (
        <p className="py-8 text-center text-neutral-600">{t.print.empty}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left text-xs tracking-wide uppercase">
              <th className="py-1.5 pr-3">{t.print.time}</th>
              <th className="py-1.5 pr-3">{t.print.duration}</th>
              <th className="py-1.5 pr-3">{t.agenda.patient}</th>
              <th className="py-1.5 pr-3">{t.agenda.room}</th>
              <th className="py-1.5 pr-3">{t.agenda.doctor}</th>
              <th className="py-1.5">{t.agenda.status}</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="break-inside-avoid border-b border-neutral-300 align-top">
                <td className="py-2 pr-3 font-medium whitespace-nowrap tabular-nums">
                  {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDuration(Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60000))}
                </td>
                <td className="py-2 pr-3">
                  <span className="font-medium">
                    {appointment.patient.lastName} {appointment.patient.firstName}
                  </span>
                  {appointment.patient.phone ? (
                    <span className="block text-xs text-neutral-600">{appointment.patient.phone}</span>
                  ) : null}
                  {appointment.reason ? <span className="block text-xs text-neutral-600">{appointment.reason}</span> : null}
                </td>
                <td className="py-2 pr-3">{appointment.room.name}</td>
                <td className="py-2 pr-3">{doctorLabel(appointment.doctor.title, appointment.doctor.name)}</td>
                <td className="py-2">{t.status[appointment.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
