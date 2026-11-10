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

  const [appointments, stops, doctor] = await Promise.all([
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
    db.agendaStop.findMany({
      where: {
        startsAt: { lt: end },
        endsAt: { gt: start },
        ...(doctorId ? { OR: [{ doctors: { some: { id: doctorId } } }, { doctors: { none: {} } }] } : {}),
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        note: true,
        room: { select: { name: true } },
        doctors: { orderBy: { name: "asc" }, select: { name: true, title: true } },
      },
    }),
    doctorId ? db.user.findUnique({ where: { id: doctorId }, select: { name: true, title: true } }) : null,
  ]);

  type Row =
    | {
        kind: "appointment";
        id: string;
        startsAt: Date;
        endsAt: Date;
        patient: string;
        phone: string | null;
        room: string;
        doctor: string;
        status: (typeof appointments)[number]["status"];
        reason: string | null;
      }
    | { kind: "stop"; id: string; startsAt: Date; endsAt: Date; note: string; room: string; doctors: string[] };

  // Visite e stop in un unico elenco, in ordine di orario.
  const rows: Row[] = [
    ...appointments.map((a): Row => ({
      kind: "appointment",
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      patient: `${a.patient.lastName} ${a.patient.firstName}`,
      phone: a.patient.phone,
      room: a.room.name,
      doctor: doctorLabel(a.doctor.title, a.doctor.name),
      status: a.status,
      reason: a.reason,
    })),
    ...stops.map((stop): Row => ({
      kind: "stop",
      id: stop.id,
      startsAt: stop.startsAt,
      endsAt: stop.endsAt,
      note: stop.note,
      room: stop.room.name,
      doctors: stop.doctors.map((d) => doctorLabel(d.title, d.name)),
    })),
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

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

      {rows.length === 0 ? (
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
          {rows.map((row) => {
            const time = `${formatTime(row.startsAt)}–${formatTime(row.endsAt)}`;
            const duration = formatDuration(Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60000));
            if (row.kind === "stop") {
              return (
                // Ogni voce è un <tbody>: in stampa riga e descrizione restano sulla stessa pagina.
                <tbody key={row.id} className="break-inside-avoid">
                  <tr className="border-b border-neutral-300 bg-[repeating-linear-gradient(-45deg,#e5e5e5_0_6px,#fff_6px_12px)] align-top print:[print-color-adjust:exact]">
                    <td className="py-2 pr-3 font-medium whitespace-nowrap tabular-nums">{time}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{duration}</td>
                    <td className="py-2 pr-3" colSpan={2}>
                      <span className="mr-2 rounded bg-black px-1.5 py-0.5 text-xs font-bold tracking-wider text-white">
                        {t.stops.printLabel}
                      </span>
                      <span className="font-medium">{row.note}</span>
                      <span className="block text-xs text-neutral-600">{row.room}</span>
                    </td>
                    <td className="py-2 pr-3" colSpan={2}>
                      {row.doctors.join(", ")}
                    </td>
                  </tr>
                </tbody>
              );
            }
            return (
              <tbody key={row.id} className="break-inside-avoid">
                <tr className={row.reason ? "align-top" : "border-b border-neutral-300 align-top"}>
                  <td className="py-2 pr-3 font-medium whitespace-nowrap tabular-nums">{time}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{duration}</td>
                  <td className="py-2 pr-3">
                    <span className="font-medium">{row.patient}</span>
                    {row.phone ? <span className="block text-xs text-neutral-600">{row.phone}</span> : null}
                  </td>
                  <td className="py-2 pr-3">{row.room}</td>
                  <td className="py-2 pr-3">{row.doctor}</td>
                  <td className="py-2">{t.status[row.status]}</td>
                </tr>
                {row.reason ? (
                  <tr className="border-b border-neutral-300">
                    <td colSpan={6} className="pt-0 pb-3">
                      {/* Il motivo della visita, grande e per intero. */}
                      <div className="rounded-md border-l-4 border-black bg-neutral-100 px-3 py-2 print:[print-color-adjust:exact]">
                        <span className="block text-[10px] font-semibold tracking-wider text-neutral-600 uppercase">
                          {t.print.reason}
                        </span>
                        <p className="text-base leading-snug whitespace-pre-wrap">{row.reason}</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            );
          })}
        </table>
      )}
    </article>
  );
}
