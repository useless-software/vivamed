"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import withDragAndDrop, { type EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { PlusIcon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./agenda.css";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, NativeSelect } from "@/components/form";
import { StatusIcon } from "@/components/status-style";
import { doctorLabel } from "@/lib/doctors";
import { t } from "@/lib/messages";
import { canWriteAppointment } from "@/lib/permissions";
import { celebrate } from "@/lib/client/celebrate";
import { moveAppointment } from "@/server/actions/appointments";
import { moveStop } from "@/server/actions/stops";
import { AppointmentDialog, type AppointmentDraft } from "./appointment-dialog";
import { DayNavigator } from "./day-navigator";
import { StopDialog, type StopDraft } from "./stop-dialog";
import type { AgendaEvent, AgendaProps, AgendaStopEvent } from "./types";

/** Riquadro del calendario: una visita oppure uno stop. */
type CalendarEvent = {
  /** Chiave unica nel calendario ("a:…" per le visite, "s:…" per gli stop). */
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
} & ({ kind: "appointment"; appointment: AgendaEvent } | { kind: "stop"; stop: AgendaStopEvent });
type Resource = { id: string; title: string };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { locale: it }),
  getDay,
  locales: { it },
});
const DnDCalendar = withDragAndDrop<CalendarEvent, Resource>(Calendar);

const DAY_START = new Date(1970, 0, 1, 6, 0);
const DAY_END = new Date(1970, 0, 1, 22, 0);
const SCROLL_TO = new Date(1970, 0, 1, 7, 30);
const MIN_DURATION_MS = 30 * 60 * 1000;

/** Testo nero o bianco, a seconda di quale si legge meglio sul colore della sala. */
function readableText(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0f172a" : "#ffffff";
}

function parseLocalDate(value: string | null): Date {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function AgendaView({ events, stops, doctors, rooms, user, doctorFilter, date, preselectedPatient }: AgendaProps) {
  const router = useRouter();
  const current = parseLocalDate(date);
  const [showCancelled, setShowCancelled] = useState(false);
  // Spostamenti già fatti col mouse ma non ancora confermati dal server.
  const [moves, setMoves] = useState<Record<string, { start: Date; end: Date; resourceId?: string }>>({});
  const [stopDraft, setStopDraft] = useState<StopDraft | null>(null);
  const [draft, setDraft] = useState<AppointmentDraft | null>(() =>
    // Arrivo da "Prenota appuntamento" nella scheda paziente: apro subito il form.
    preselectedPatient ? { ...defaultSlot(current), patient: preselectedPatient } : null,
  );

  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const doctorById = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);
  const doctorName = useCallback(
    (id: string) => {
      const doctor = doctorById.get(id);
      return doctor ? doctorLabel(doctor.title, doctor.name) : "";
    },
    [doctorById],
  );

  const visible = useMemo(
    () => events.filter((event) => showCancelled || event.status !== "CANCELLED"),
    [events, showCancelled],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(
    () => [
      ...visible.map((event): CalendarEvent => {
        const id = `a:${event.id}`;
        const move = moves[id];
        return {
          id,
          kind: "appointment",
          title: `${event.patient.label} · ${doctorName(event.doctorId)}`,
          start: move?.start ?? new Date(event.startsAt),
          end: move?.end ?? new Date(event.endsAt),
          resourceId: move?.resourceId ?? event.roomId,
          appointment: event,
        };
      }),
      ...stops.map((stop): CalendarEvent => {
        const id = `s:${stop.id}`;
        const move = moves[id];
        return {
          id,
          kind: "stop",
          title: stop.note,
          start: move?.start ?? new Date(stop.startsAt),
          end: move?.end ?? new Date(stop.endsAt),
          resourceId: move?.resourceId ?? stop.roomId,
          stop,
        };
      }),
    ],
    [visible, stops, moves, doctorName],
  );

  // Una colonna per ogni sala attiva (più quelle disattivate che hanno ancora appuntamenti).
  const resources = useMemo<Resource[]>(() => {
    const used = new Set(events.map((event) => event.roomId));
    return rooms.filter((room) => room.active || used.has(room.id)).map((room) => ({ id: room.id, title: room.name }));
  }, [events, rooms]);

  // Appuntamenti per giorno (nel fuso del browser), per la striscia dei giorni.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      if (event.status === "CANCELLED") continue;
      const key = format(new Date(event.startsAt), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const navigate = useCallback(
    (changes: Record<string, string | null>, mode: "push" | "replace" = "push") => {
      const params = new URLSearchParams();
      const next: Record<string, string | null> = {
        data: date,
        // Il medico vede di default la propria agenda: "tutti" va scritto esplicitamente.
        medico: doctorFilter === "tutti" && user.role !== "DOCTOR" ? null : doctorFilter,
        ...changes,
      };
      for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
      const query = params.toString();
      router[mode](query ? `/agenda?${query}` : "/agenda", { scroll: false });
    },
    [date, doctorFilter, user.role, router],
  );

  const goTo = useCallback(
    (target: Date) => {
      const key = format(target, "yyyy-MM-dd");
      navigate({ data: key === format(new Date(), "yyyy-MM-dd") ? null : key });
    },
    [navigate],
  );

  function openNew(slot?: SlotInfo) {
    const base = slot
      ? {
          start: slot.start,
          // Un semplice clic seleziona una sola casella: la allunghiamo a mezz'ora.
          end: new Date(Math.max(slot.end.getTime(), slot.start.getTime() + MIN_DURATION_MS)),
        }
      : defaultSlot(current);
    setDraft({
      ...base,
      patient: null,
      // Cliccando in una colonna, la sala è quella della colonna.
      roomId: slot?.resourceId === undefined ? undefined : String(slot.resourceId),
      doctorId: doctorFilter !== "tutti" ? doctorFilter : undefined,
    });
  }

  function openExisting(event: CalendarEvent) {
    if (event.kind === "stop") {
      setStopDraft({
        id: event.stop.id,
        start: event.start,
        end: event.end,
        roomId: event.stop.roomId,
        doctorIds: event.stop.doctorIds,
        note: event.stop.note,
      });
      return;
    }
    const source = event.appointment;
    setDraft({
      id: source.id,
      start: event.start,
      end: event.end,
      doctorId: source.doctorId,
      roomId: source.roomId,
      patient: source.patient,
      reason: source.reason,
      status: source.status,
      outcome: source.outcome,
    });
  }

  async function onMove({ event, start, end, resourceId, isAllDay }: EventInteractionArgs<CalendarEvent>) {
    if (isAllDay) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const roomId = resourceId === undefined ? undefined : String(resourceId);
    setMoves((previous) => ({ ...previous, [event.id]: { start: startDate, end: endDate, resourceId: roomId } }));

    const input = { startsAt: startDate.toISOString(), endsAt: endDate.toISOString(), roomId };
    const result =
      event.kind === "stop"
        ? await moveStop({ id: event.stop.id, ...input })
        : await moveAppointment({ id: event.appointment.id, ...input });
    // A questo punto i dati aggiornati (o quelli originali, in caso di errore) sono già arrivati dal server.
    setMoves((previous) => {
      const rest = { ...previous };
      delete rest[event.id];
      return rest;
    });
    if (result.error) toast.error(result.error);
    else {
      toast.success(t.agenda.moved);
      celebrate("small");
    }
  }

  // Oggetto stabile: se cambiasse a ogni render, il calendario ricreerebbe tutti i riquadri.
  const components = useMemo(
    () => ({
      event: function Event({ event }: { event: CalendarEvent }) {
        return <EventLabel event={event} doctorName={doctorName} />;
      },
    }),
    [doctorName],
  );

  const canDrag = (event: CalendarEvent) =>
    event.kind === "stop"
      ? canWriteAppointment(user, "") ||
        (event.stop.doctorIds.length > 0 && event.stop.doctorIds.every((id) => id === user.id))
      : event.appointment.status !== "CANCELLED" && canWriteAppointment(user, event.appointment.doctorId);

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[36rem] flex-col gap-3 md:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <DayNavigator current={current} counts={counts} onChange={goTo} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/agenda/stampa?data=${format(current, "yyyy-MM-dd")}${doctorFilter !== "tutti" ? `&medico=${doctorFilter}` : ""}`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: "outline" })}
          >
            <PrinterIcon /> {t.agenda.print}
          </a>
          <Button variant="outline" onClick={() => setStopDraft({ ...defaultSlot(current) })}>
            <span aria-hidden className="barber-pole h-3.5 w-5 rounded-[3px]" style={stopColor("var(--primary)")} />
            {t.stops.create}
          </Button>
          <Button onClick={() => openNew()}>
            <PlusIcon /> {t.agenda.new}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <NativeSelect
          aria-label={t.agenda.doctor}
          className="w-auto"
          value={doctorFilter}
          onChange={(event) => navigate({ medico: event.target.value })}
        >
          <option value="tutti">{t.agenda.allDoctors}</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctorLabel(doctor.title, doctor.name)}
            </option>
          ))}
        </NativeSelect>
        <Checkbox
          label={t.agenda.showCancelled}
          checked={showCancelled}
          onChange={(event) => setShowCancelled(event.target.checked)}
        />
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {(["PENDING", "CONFIRMED", "CANCELLED"] as const).map((status) => (
            <span key={status} className="inline-flex items-center gap-1">
              <StatusIcon status={status} className="size-3.5" />
              {t.status[status]}
            </span>
          ))}
        </span>
      </div>

      <div className="min-h-0 flex-1 rounded-xl border bg-card p-2">
        {resources.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t.agenda.noRooms}</p>
        ) : (
          <DnDCalendar
            localizer={localizer}
            culture="it"
            toolbar={false}
            date={current}
            onNavigate={goTo}
            view="day"
            views={["day"]}
            onView={() => {}}
            events={calendarEvents}
            resources={resources}
            resourceIdAccessor="id"
            resourceTitleAccessor="title"
            step={15}
            timeslots={4}
            min={DAY_START}
            max={DAY_END}
            scrollToTime={SCROLL_TO}
            components={components}
            selectable
            onSelectSlot={openNew}
            onSelectEvent={openExisting}
            draggableAccessor={canDrag}
            resizableAccessor={canDrag}
            onEventDrop={onMove}
            onEventResize={onMove}
            tooltipAccessor={(event) =>
              event.kind === "stop"
                ? [`${t.stops.label}: ${event.stop.note}`, event.stop.doctorIds.map(doctorName).join(", ")]
                    .filter(Boolean)
                    .join("\n")
                : [
                    event.title,
                    roomById.get(event.appointment.roomId)?.name,
                    t.status[event.appointment.status],
                    event.appointment.reason,
                  ]
                    .filter(Boolean)
                    .join("\n")
            }
            eventPropGetter={(event) => {
              const roomId = event.kind === "stop" ? event.stop.roomId : event.appointment.roomId;
              const color = roomById.get(roomId)?.color ?? "#3b82f6";
              if (event.kind === "stop") {
                return { className: "agenda-stop barber-pole", style: { ...stopColor(color), borderColor: color } };
              }
              const { status, outcome } = event.appointment;
              return {
                className: `agenda-event agenda-event-${status.toLowerCase()}${outcome ? ` agenda-event-${outcome.toLowerCase()}` : ""}`,
                style: {
                  backgroundColor: color,
                  borderColor: color,
                  color: readableText(color),
                  // Usato dal riquadro che si allarga al passaggio del mouse.
                  ["--event-bg" as string]: color,
                },
              };
            }}
          />
        )}
      </div>

      <StopDialog draft={stopDraft} doctors={doctors} rooms={rooms} user={user} onClose={() => setStopDraft(null)} />
      <AppointmentDialog
        draft={draft}
        doctors={doctors}
        rooms={rooms}
        user={user}
        onClose={() => {
          setDraft(null);
          // Toglie "?paziente=…" dall'indirizzo, altrimenti ricaricando si riaprirebbe il form.
          if (preselectedPatient) navigate({}, "replace");
        }}
      />
    </div>
  );
}

/** Colore delle strisce di uno stop (variabile CSS usata da .barber-pole). */
function stopColor(color: string) {
  return { ["--stop-color" as string]: color };
}

/**
 * Contenuto del riquadro. Visita: stato, orario, paziente e medico, e sotto il
 * motivo per intero (al passaggio del mouse il riquadro si allarga per mostrarlo
 * tutto). Stop: un'etichetta leggibile sopra le strisce.
 */
function EventLabel({ event, doctorName }: { event: CalendarEvent; doctorName: (id: string) => string }) {
  if (event.kind === "stop") {
    const names = event.stop.doctorIds.map(doctorName).filter(Boolean).join(", ");
    return (
      <span className="agenda-stop-label">
        <span className="font-semibold tracking-wide uppercase">⛔ {t.stops.label}</span>
        <span className="block font-medium break-words whitespace-normal">{event.stop.note}</span>
        {names ? <span className="block text-[11px] opacity-80">{names}</span> : null}
      </span>
    );
  }
  const { status, reason } = event.appointment;
  return (
    <span className="agenda-event-body">
      <span className="flex items-start gap-1">
        {/* Pastiglia bianca: l'icona di stato resta leggibile su qualunque colore di sala. */}
        <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-white/95 shadow-sm">
          <StatusIcon status={status} className="size-3" />
        </span>
        <span>
          <span className="tabular-nums opacity-80">{format(event.start, "HH:mm")}</span> {event.title}
        </span>
      </span>
      {reason ? <span className="agenda-event-reason">{reason}</span> : null}
    </span>
  );
}

/** Prossima mezz'ora "tonda" del giorno mostrato, entro l'orario dell'agenda. */
function defaultSlot(day: Date): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(day);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.min(Math.max(Math.ceil(minutes / 30) * 30, 8 * 60), 20 * 60);
  start.setHours(Math.floor(rounded / 60), rounded % 60, 0, 0);
  return { start, end: new Date(start.getTime() + MIN_DURATION_MS) };
}
