"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import withDragAndDrop, { type EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { addDays, endOfWeek, format, getDay, parse, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./agenda.css";
import { Button } from "@/components/ui/button";
import { Checkbox, NativeSelect } from "@/components/form";
import { t } from "@/lib/messages";
import { canWriteAppointment } from "@/lib/permissions";
import { moveAppointment } from "@/server/actions/appointments";
import { AppointmentDialog, type AppointmentDraft } from "./appointment-dialog";
import type { AgendaEvent, AgendaGroup, AgendaProps } from "./types";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  source: AgendaEvent;
};
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

export function AgendaView({ events, doctors, rooms, user, filters, date, view, group, preselectedPatient }: AgendaProps) {
  const router = useRouter();
  const current = parseLocalDate(date);
  const [showCancelled, setShowCancelled] = useState(false);
  // Spostamenti già fatti col mouse ma non ancora confermati dal server.
  const [moves, setMoves] = useState<Record<string, { start: Date; end: Date; resourceId?: string }>>({});
  const [draft, setDraft] = useState<AppointmentDraft | null>(() =>
    // Arrivo da "Prenota appuntamento" nella scheda paziente: apro subito il form.
    preselectedPatient ? { ...defaultSlot(current), patient: preselectedPatient } : null,
  );

  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const doctorById = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);
  // Le colonne per sala/medico hanno senso solo nella vista giornaliera.
  const grouping: AgendaGroup = view === "day" ? group : "none";

  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      events
        .filter((event) => showCancelled || event.status !== "CANCELLED")
        .map((event) => {
          const move = moves[event.id];
          return {
            id: event.id,
            title: `${event.patient.label} · ${doctorById.get(event.doctorId)?.name ?? ""}`,
            start: move?.start ?? new Date(event.startsAt),
            end: move?.end ?? new Date(event.endsAt),
            resourceId:
              move?.resourceId ??
              (grouping === "room" ? event.roomId : grouping === "doctor" ? event.doctorId : undefined),
            source: event,
          };
        }),
    [events, moves, showCancelled, grouping, doctorById],
  );

  const resources = useMemo<Resource[] | undefined>(() => {
    if (grouping === "none") return undefined;
    const used = new Set(events.map((event) => (grouping === "room" ? event.roomId : event.doctorId)));
    const all: { id: string; name: string; active: boolean }[] = grouping === "room" ? rooms : doctors;
    const selected = grouping === "room" ? filters.room : filters.doctor;
    return all
      .filter((item) => item.active || used.has(item.id))
      .filter((item) => selected === "tutti" || selected === "tutte" || item.id === selected)
      .map((item) => ({ id: item.id, title: item.name }));
  }, [grouping, events, rooms, doctors, filters]);

  function navigate(changes: Record<string, string | null>, mode: "push" | "replace" = "push") {
    const params = new URLSearchParams();
    const next: Record<string, string | null> = {
      data: date,
      vista: view === "day" ? "giorno" : null,
      colonne: group === "room" ? "sala" : group === "doctor" ? "medico" : null,
      // Il medico vede di default la propria agenda: "tutti" va scritto esplicitamente.
      medico: filters.doctor === "tutti" && user.role !== "DOCTOR" ? null : filters.doctor,
      sala: filters.room === "tutte" ? null : filters.room,
      ...changes,
    };
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    router[mode](query ? `/agenda?${query}` : "/agenda");
  }

  const goTo = (target: Date) => navigate({ data: format(target, "yyyy-MM-dd") });
  const step = view === "day" ? 1 : 7;

  const label =
    view === "day"
      ? format(current, "EEEE d MMMM yyyy", { locale: it })
      : `${format(startOfWeek(current, { locale: it }), "d MMM", { locale: it })} – ${format(
          endOfWeek(current, { locale: it }),
          "d MMM yyyy",
          { locale: it },
        )}`;

  function openNew(slot?: SlotInfo) {
    const base = slot
      ? {
          start: slot.start,
          // Un semplice clic seleziona una sola casella: la allunghiamo a mezz'ora.
          end: new Date(Math.max(slot.end.getTime(), slot.start.getTime() + MIN_DURATION_MS)),
        }
      : defaultSlot(current);
    const resourceId = slot?.resourceId === undefined ? undefined : String(slot.resourceId);
    setDraft({
      ...base,
      patient: null,
      roomId: grouping === "room" ? resourceId : filters.room !== "tutte" ? filters.room : undefined,
      doctorId: grouping === "doctor" ? resourceId : filters.doctor !== "tutti" ? filters.doctor : undefined,
    });
  }

  function openExisting(event: CalendarEvent) {
    const source = event.source;
    setDraft({
      id: source.id,
      start: event.start,
      end: event.end,
      doctorId: source.doctorId,
      roomId: source.roomId,
      patient: source.patient,
      reason: source.reason,
      status: source.status,
    });
  }

  async function onMove({ event, start, end, resourceId, isAllDay }: EventInteractionArgs<CalendarEvent>) {
    if (isAllDay) return;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const resource = resourceId === undefined ? undefined : String(resourceId);
    setMoves((previous) => ({ ...previous, [event.id]: { start: startDate, end: endDate, resourceId: resource } }));

    const result = await moveAppointment({
      id: event.id,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      roomId: grouping === "room" ? resource : undefined,
      doctorId: grouping === "doctor" ? resource : undefined,
    });
    // A questo punto i dati aggiornati (o quelli originali, in caso di errore) sono già arrivati dal server.
    setMoves((previous) => {
      const rest = { ...previous };
      delete rest[event.id];
      return rest;
    });
    if (result.error) toast.error(result.error);
    else toast.success(t.agenda.moved);
  }

  const canDrag = (event: CalendarEvent) =>
    event.source.status !== "CANCELLED" && canWriteAppointment(user, event.source.doctorId);

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[34rem] flex-col gap-3 md:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigate({ data: null })}>
          {t.agenda.today}
        </Button>
        <Button variant="outline" size="icon" aria-label={t.agenda.back} onClick={() => goTo(addDays(current, -step))}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label={t.agenda.forward} onClick={() => goTo(addDays(current, step))}>
          <ChevronRightIcon />
        </Button>
        <h1 className="mr-auto px-1 text-lg font-semibold first-letter:uppercase">{label}</h1>
        <Button onClick={() => openNew()}>
          <PlusIcon /> {t.agenda.new}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex rounded-lg border bg-background p-0.5">
          {(["day", "week"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={view === option ? "secondary" : "ghost"}
              aria-pressed={view === option}
              onClick={() => navigate({ vista: option === "day" ? "giorno" : null })}
            >
              {option === "day" ? t.agenda.day : t.agenda.week}
            </Button>
          ))}
        </div>
        <NativeSelect
          aria-label={t.agenda.doctor}
          className="w-auto"
          value={filters.doctor}
          onChange={(event) => navigate({ medico: event.target.value })}
        >
          <option value="tutti">{t.agenda.allDoctors}</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={t.agenda.room}
          className="w-auto"
          value={filters.room}
          onChange={(event) => navigate({ sala: event.target.value === "tutte" ? null : event.target.value })}
        >
          <option value="tutte">{t.agenda.allRooms}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </NativeSelect>
        {view === "day" ? (
          <NativeSelect
            aria-label={t.agenda.groupBy}
            className="w-auto"
            value={group}
            onChange={(event) =>
              navigate({
                colonne: event.target.value === "room" ? "sala" : event.target.value === "doctor" ? "medico" : null,
              })
            }
          >
            <option value="none">{`${t.agenda.groupBy}: ${t.agenda.groupNone}`}</option>
            <option value="room">{`${t.agenda.groupBy}: ${t.agenda.groupRoom}`}</option>
            <option value="doctor">{`${t.agenda.groupBy}: ${t.agenda.groupDoctor}`}</option>
          </NativeSelect>
        ) : null}
        <Checkbox
          label={t.agenda.showCancelled}
          checked={showCancelled}
          onChange={(event) => setShowCancelled(event.target.checked)}
        />
      </div>

      <div className="min-h-0 flex-1 rounded-xl border bg-card p-2">
        <DnDCalendar
          localizer={localizer}
          culture="it"
          toolbar={false}
          date={current}
          onNavigate={goTo}
          view={view}
          views={["day", "week"]}
          onView={() => {}}
          onDrillDown={(target) => navigate({ data: format(target, "yyyy-MM-dd"), vista: "giorno" })}
          events={calendarEvents}
          resources={resources}
          resourceIdAccessor="id"
          resourceTitleAccessor="title"
          step={15}
          timeslots={4}
          min={DAY_START}
          max={DAY_END}
          selectable
          onSelectSlot={openNew}
          onSelectEvent={openExisting}
          draggableAccessor={canDrag}
          resizableAccessor={canDrag}
          onEventDrop={onMove}
          onEventResize={onMove}
          scrollToTime={SCROLL_TO}
          components={{ event: EventLabel }}
          tooltipAccessor={(event) =>
            [event.title, roomById.get(event.source.roomId)?.name, t.status[event.source.status], event.source.reason]
              .filter(Boolean)
              .join("\n")
          }
          eventPropGetter={(event) => {
            const color = roomById.get(event.source.roomId)?.color ?? "#3b82f6";
            return {
              className: `agenda-event agenda-event-${event.source.status.toLowerCase()}`,
              style: { backgroundColor: color, borderColor: color, color: readableText(color) },
            };
          }}
        />
      </div>

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

/** Contenuto del riquadro: orario e paziente sulla stessa riga, leggibili anche negli appuntamenti brevi. */
function EventLabel({ event }: { event: CalendarEvent }) {
  return (
    <span>
      <span className="tabular-nums opacity-80">{format(event.start, "HH:mm")}</span> {event.title}
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
