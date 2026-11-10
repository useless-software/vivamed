import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorInSentence, doctorLabel } from "@/lib/doctors";
import { dayKey, formatDayKey, formatTime } from "@/lib/format";
import { t } from "@/lib/messages";
import { renderReminder } from "@/lib/reminder-message";
import {
  ARCHIVE_SIZES,
  parseArchiveSize,
  parseWindow,
  REMINDER_WINDOWS,
  reminderBounds,
} from "@/lib/reminders";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { RemindersList, type ReminderRow } from "./reminders-list";

export const metadata: Metadata = { title: t.reminders.title };

export default function RemindersPage({ searchParams }: PageProps<"/promemoria">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <RemindersContent searchParams={searchParams} />
    </Suspense>
  );
}

function currentBounds(days: ReturnType<typeof parseWindow>) {
  return reminderBounds(new Date(), days);
}

const appointmentSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  reminderSentAt: true,
  doctorId: true,
  patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
  doctor: { select: { name: true, title: true } },
  room: { select: { name: true } },
} as const;

async function RemindersContent({ searchParams }: Pick<PageProps<"/promemoria">, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const days = parseWindow(params.entro);
  const archiveSize = parseArchiveSize(params.archivio);
  const bounds = currentBounds(days);
  // Il medico vede solo i suoi pazienti.
  const doctorId = user.role === "DOCTOR" ? user.id : undefined;

  const [settings, active, archived] = await Promise.all([
    getSettings(),
    db.appointment.findMany({
      where: {
        doctorId,
        status: { not: "CANCELLED" },
        startsAt: { gte: bounds.now, lt: bounds.until },
        // Già inviati: restano fino al giorno della visita.
        OR: [{ reminderSentAt: null }, { startsAt: { gte: bounds.archiveFrom } }],
      },
      orderBy: { startsAt: "asc" },
      select: appointmentSelect,
    }),
    db.appointment.findMany({
      where: { doctorId, reminderSentAt: { not: null }, startsAt: { lt: bounds.archiveFrom } },
      orderBy: { startsAt: "desc" },
      take: archiveSize,
      select: appointmentSelect,
    }),
  ]);

  const toRow = (appointment: (typeof active)[number]): ReminderRow => {
    const day = dayKey(appointment.startsAt);
    const values = {
      paziente: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      nome: appointment.patient.firstName,
      medico: doctorInSentence(appointment.doctor.title, appointment.doctor.name),
      data: formatDayKey(day),
      giorno: formatDayKey(day, true),
      ora: formatTime(appointment.startsAt),
      sala: appointment.room.name,
    };
    return {
      id: appointment.id,
      day,
      dayLabel: formatDayKey(day, true),
      time: `${formatTime(appointment.startsAt)}–${formatTime(appointment.endsAt)}`,
      patientId: appointment.patient.id,
      patientName: `${appointment.patient.lastName} ${appointment.patient.firstName}`,
      phone: appointment.patient.phone,
      doctor: doctorLabel(appointment.doctor.title, appointment.doctor.name),
      room: appointment.room.name,
      status: appointment.status,
      sent: appointment.reminderSentAt !== null,
      message: renderReminder(settings.reminderTemplate, values),
    };
  };

  const rows = active.map(toRow);
  const toSend = rows.filter((row) => !row.sent).length;
  const today = dayKey(bounds.now);
  const tomorrow = dayKey(bounds.archiveFrom);

  const href = (changes: { entro?: number; archivio?: number }) => {
    const search = new URLSearchParams();
    const nextDays = changes.entro ?? days;
    const nextArchive = changes.archivio ?? archiveSize;
    if (nextDays !== 7) search.set("entro", String(nextDays));
    if (nextArchive !== 10) search.set("archivio", String(nextArchive));
    const text = search.toString();
    return text ? `/promemoria?${text}` : "/promemoria";
  };

  return (
    <>
      <PageHeader title={t.reminders.title} subtitle={t.reminders.subtitle} />
      <nav aria-label={t.reminders.window} className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-full border bg-background p-0.5">
          {REMINDER_WINDOWS.map((value) => (
            <Link
              key={value}
              href={href({ entro: value })}
              aria-current={value === days ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                value === days ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
              )}
            >
              {t.reminders.windows[value]}
            </Link>
          ))}
        </div>
        {rows.length > 0 ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
            {t.reminders.toSend(toSend)}
          </span>
        ) : null}
      </nav>

      <RemindersList rows={rows} today={today} tomorrow={tomorrow} emptyText={t.reminders.empty} />

      <Card className="mt-8">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{t.reminders.archive}</CardTitle>
            <CardDescription>{t.reminders.archiveHint}</CardDescription>
          </div>
          <div className="flex rounded-full border bg-background p-0.5 text-sm">
            {ARCHIVE_SIZES.map((value) => (
              <Link
                key={value}
                href={href({ archivio: value })}
                aria-current={value === archiveSize ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 font-medium",
                  value === archiveSize ? "bg-secondary shadow-sm" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {t.reminders.archiveSizes(value)}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <RemindersList
            rows={archived.map(toRow)}
            today={today}
            tomorrow={tomorrow}
            emptyText={t.reminders.archiveEmpty}
            archived
          />
        </CardContent>
      </Card>
    </>
  );
}
