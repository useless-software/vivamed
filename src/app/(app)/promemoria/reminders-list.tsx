"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { CheckCircle2Icon, CircleIcon, CopyIcon, PhoneIcon } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@/components/status-style";
import { StatusToggle } from "@/components/status-toggle";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/client/clipboard";
import { celebrate } from "@/lib/client/celebrate";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { setAppointmentStatus } from "@/server/actions/appointments";
import { setReminderSent } from "@/server/actions/reminders";

export type ReminderRow = {
  id: string;
  day: string;
  dayLabel: string;
  time: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  doctor: string;
  room: string;
  status: AppointmentStatus;
  sent: boolean;
  message: string;
};

export function RemindersList({
  rows,
  today,
  tomorrow,
  emptyText,
  archived,
}: {
  rows: ReminderRow[];
  today: string;
  tomorrow: string;
  emptyText: string;
  archived?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground animate-in fade-in-0">
        {emptyText}
      </p>
    );
  }

  // Raggruppati per giorno, nell'ordine in cui arrivano.
  const groups: { day: string; label: string; rows: ReminderRow[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last?.day === row.day) last.rows.push(row);
    else groups.push({ day: row.day, label: row.dayLabel, rows: [row] });
  }
  const prefix = (day: string) => (day === today ? "Oggi · " : day === tomorrow ? "Domani · " : "");

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.day} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground first-letter:uppercase">
            {prefix(group.day)}
            {group.label}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.rows.map((row, index) => (
              <ReminderItem key={row.id} row={row} archived={archived} index={index} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ReminderItem({ row, archived, index }: { row: ReminderRow; archived?: boolean; index: number }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSentOptimistic] = useOptimistic(row.sent);
  const [status, setStatusOptimistic] = useOptimistic(row.status);

  async function copy() {
    const ok = await copyText(row.message);
    if (ok) toast.success(t.reminders.copied);
    else toast.error(t.reminders.copyFailed);
  }

  function toggleSent() {
    const next = !sent;
    startTransition(async () => {
      setSentOptimistic(next);
      const result = await setReminderSent(row.id, next);
      if (result.error) toast.error(result.error);
      else {
        toast.success(next ? t.reminders.markedSent : t.reminders.markedUnsent);
        if (next) celebrate("small");
      }
    });
  }

  function changeStatus(next: AppointmentStatus) {
    startTransition(async () => {
      setStatusOptimistic(next);
      const result = await setAppointmentStatus(row.id, next);
      if (result.error) toast.error(result.error);
      else celebrate(next === "CONFIRMED" ? "big" : "small");
    });
  }

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-3 shadow-xs transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both hover:shadow-md",
        sent && !archived && "bg-muted/60 opacity-60 grayscale",
        archived && "opacity-75",
      )}
    >
      <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">{row.time}</span>
      <div className="min-w-48 flex-1">
        <Link href={`/pazienti/${row.patientId}`} className="font-medium hover:underline">
          {row.patientName}
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {row.phone ? (
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="size-3" />
              {row.phone}
            </span>
          ) : (
            <span className="text-amber-700">{t.reminders.noPhone}</span>
          )}
          <span>
            {row.doctor} · {row.room}
          </span>
        </p>
      </div>
      <StatusToggle compact value={status} onChange={changeStatus} disabled={pending || archived} />
      <Button type="button" variant="outline" size="sm" onClick={copy} title={row.message}>
        <CopyIcon /> {t.reminders.copy}
      </Button>
      <button
        type="button"
        role="checkbox"
        aria-checked={sent}
        onClick={toggleSent}
        disabled={pending}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition-colors",
          sent ? "bg-green-100 text-green-800" : "text-muted-foreground hover:bg-muted",
        )}
      >
        {sent ? (
          <CheckCircle2Icon className="size-4 animate-in zoom-in-50 spin-in-12" />
        ) : (
          <CircleIcon className="size-4" />
        )}
        {t.reminders.sent}
      </button>
    </li>
  );
}
