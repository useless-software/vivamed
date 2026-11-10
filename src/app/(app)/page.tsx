import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BellRingIcon, CalendarCheckIcon, CalendarClockIcon, CalendarDaysIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { MonthlyChart, type MonthPoint } from "@/components/dashboard/monthly-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageLoading } from "@/components/page-loading";
import { StatusIcon } from "@/components/status-style";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorLabel } from "@/lib/doctors";
import { addDaysToKey, dayKey, formatTime, startOfZonedDay, timeZone } from "@/lib/format";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.home.title };

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Dashboard />
    </Suspense>
  );
}

/** Giorni e settimane di riferimento, nel fuso dello studio. */
function calendar() {
  const now = new Date();
  const today = dayKey(now);
  // Settimana da lunedì a domenica.
  const weekday = (new Date(`${today}T12:00:00.000Z`).getUTCDay() + 6) % 7;
  const monday = addDaysToKey(today, -weekday);
  const hour = Number(
    new Intl.DateTimeFormat("it-IT", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  return {
    now,
    hour,
    today: startOfZonedDay(today),
    tomorrow: startOfZonedDay(addDaysToKey(today, 1)),
    dayAfter: startOfZonedDay(addDaysToKey(today, 2)),
    weekStart: startOfZonedDay(monday),
    nextWeekStart: startOfZonedDay(addDaysToKey(monday, 7)),
    lastWeekStart: startOfZonedDay(addDaysToKey(monday, -7)),
    inSevenDays: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    // Primo giorno del mese di 11 mesi fa: 12 mesi in tutto, quello in corso compreso.
    firstMonth: startOfZonedDay(
      (() => {
        const [year, month] = today.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1 - 11, 1));
        return date.toISOString().slice(0, 10);
      })(),
    ),
    monthKeys: (() => {
      const [year, month] = today.split("-").map(Number);
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(Date.UTC(year, month - 1 - 11 + i, 1));
        return date.toISOString().slice(0, 7);
      });
    })(),
  };
}

const shortMonth = new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: "UTC" });
const longMonth = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

async function Dashboard() {
  const user = await requireUser();
  const c = calendar();
  // Il medico vede i propri numeri; gli altri quelli di tutto lo studio.
  const doctorId = user.role === "DOCTOR" ? user.id : undefined;
  const active = { doctorId, status: { not: "CANCELLED" as const } };

  const [todayCount, tomorrowCount, weekPatients, lastWeekPatients, newPatients, upcoming, confirmed, toRemind, monthly, next] =
    await Promise.all([
      db.appointment.count({ where: { ...active, startsAt: { gte: c.today, lt: c.tomorrow } } }),
      db.appointment.count({ where: { ...active, startsAt: { gte: c.tomorrow, lt: c.dayAfter } } }),
      db.appointment.groupBy({
        by: ["patientId"],
        where: { ...active, startsAt: { gte: c.weekStart, lt: c.nextWeekStart } },
      }),
      db.appointment.groupBy({
        by: ["patientId"],
        where: { ...active, startsAt: { gte: c.lastWeekStart, lt: c.weekStart } },
      }),
      db.patient.count({ where: { createdAt: { gte: c.weekStart } } }),
      db.appointment.count({ where: { ...active, startsAt: { gte: c.now, lt: c.inSevenDays } } }),
      db.appointment.count({
        where: { doctorId, status: "CONFIRMED", startsAt: { gte: c.now, lt: c.inSevenDays } },
      }),
      db.appointment.count({
        where: { ...active, reminderSentAt: null, startsAt: { gte: c.now, lt: c.inSevenDays } },
      }),
      // Conteggio per mese direttamente nel database, nel fuso orario dello studio.
      db.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT to_char(date_trunc('month', "startsAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') AS month,
               count(*) AS count
        FROM "Appointment"
        WHERE status <> 'CANCELLED'
          AND "startsAt" >= ${c.firstMonth}
          AND (${doctorId ?? null}::text IS NULL OR "doctorId" = ${doctorId ?? null})
        GROUP BY 1`,
      db.appointment.findMany({
        where: { ...active, startsAt: { gte: c.now, lt: c.tomorrow } },
        orderBy: { startsAt: "asc" },
        take: 6,
        select: {
          id: true,
          startsAt: true,
          status: true,
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { name: true, title: true } },
          room: { select: { name: true, color: true } },
        },
      }),
    ]);

  const byMonth = new Map(monthly.map((row) => [row.month, Number(row.count)]));
  const chart: MonthPoint[] = c.monthKeys.map((key) => {
    const date = new Date(`${key}-15T12:00:00.000Z`);
    return {
      key,
      short: shortMonth.format(date).replace(".", ""),
      long: longMonth.format(date),
      count: byMonth.get(key) ?? 0,
    };
  });
  const confirmedShare = upcoming === 0 ? 0 : Math.round((confirmed / upcoming) * 100);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="animate-in fade-in-0 slide-in-from-left-4 duration-500">
        <h1 className="text-2xl font-semibold tracking-tight">{t.home.greeting(firstName, c.hour)} 👋</h1>
        <p className="text-sm text-muted-foreground">{doctorId ? t.home.subtitleDoctor : t.home.subtitle}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile index={0} label={t.home.today} value={todayCount} icon={<CalendarDaysIcon className="size-4" />} />
        <StatTile index={1} label={t.home.tomorrow} value={tomorrowCount} icon={<CalendarClockIcon className="size-4" />} />
        <StatTile
          index={2}
          label={t.home.weekPatients}
          value={weekPatients.length}
          hint={t.home.vsLastWeek(weekPatients.length - lastWeekPatients.length)}
          icon={<UsersIcon className="size-4" />}
        />
        <StatTile
          index={3}
          label={t.home.newPatients}
          value={newPatients}
          hint={t.home.newPatientsHint}
          icon={<UserPlusIcon className="size-4" />}
        />
        <StatTile
          index={4}
          label={t.home.confirmed}
          value={confirmedShare}
          suffix="%"
          hint={t.home.confirmedHint(confirmed, upcoming)}
          icon={<CalendarCheckIcon className="size-4" />}
        />
        <StatTile
          index={5}
          label={t.home.toRemind}
          value={toRemind}
          hint={
            <Link href="/promemoria" className="text-primary hover:underline">
              {t.home.toRemindHint} →
            </Link>
          }
          icon={<BellRingIcon className="size-4" />}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <CardHeader>
            <CardTitle>{t.home.chartTitle}</CardTitle>
            <CardDescription>{t.home.chartSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={chart} />
          </CardContent>
        </Card>
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t.home.nextTitle}</CardTitle>
            <Link href="/agenda" className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t.home.openAgenda}
            </Link>
          </CardHeader>
          <CardContent>
            {next.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.home.nextEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {next.map((appointment, index) => (
                  <li
                    key={appointment.id}
                    style={{ animationDelay: `${300 + index * 60}ms` }}
                    className="flex items-center gap-3 rounded-lg bg-muted/40 py-2 pr-2 pl-2 text-sm animate-in fade-in-0 slide-in-from-right-4 fill-mode-both"
                  >
                    <span
                      aria-hidden
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: appointment.room.color }}
                    />
                    <span className="w-12 font-semibold tabular-nums">{formatTime(appointment.startsAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {appointment.patient.lastName} {appointment.patient.firstName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {doctorLabel(appointment.doctor.title, appointment.doctor.name)} · {appointment.room.name}
                      </span>
                    </span>
                    <StatusIcon status={appointment.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
