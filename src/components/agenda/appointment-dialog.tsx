"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, NativeSelect, SubmitButton } from "@/components/form";
import { StatusToggle } from "@/components/status-toggle";
import { useFormAction } from "@/components/use-form-action";
import { doctorLabel } from "@/lib/doctors";
import { t } from "@/lib/messages";
import { canWriteAppointment, type Role } from "@/lib/permissions";
import { saveAppointment, setAppointmentStatus } from "@/server/actions/appointments";
import { PatientPicker } from "./patient-picker";
import { QuickPatientDialog } from "./quick-patient-dialog";
import type { DoctorOption, Outcome, PatientRef, RoomOption, Status } from "./types";

/** Cosa sta mostrando la finestra: un appuntamento nuovo (bozza) o uno esistente. */
export type AppointmentDraft = {
  id?: string;
  start: Date;
  end: Date;
  doctorId?: string;
  roomId?: string;
  patient: PatientRef | null;
  reason?: string | null;
  status?: Status;
  outcome?: Outcome | null;
};

type Props = {
  draft: AppointmentDraft | null;
  doctors: DoctorOption[];
  rooms: RoomOption[];
  user: { id: string; role: Role };
  onClose: () => void;
};

export function AppointmentDialog({ draft, onClose, ...rest }: Props) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft?.id ? t.agenda.edit : t.agenda.new}</DialogTitle>
        </DialogHeader>
        {draft ? <AppointmentForm key={draft.id ?? "new"} draft={draft} onClose={onClose} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Unisce data ("2026-02-03") e ora ("09:30") locali in un istante ISO. */
function toIso(date: string, time: string): string | null {
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(Math.max(h * 60 + m + minutes, 0), 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

function AppointmentForm({ draft, doctors, rooms, user, onClose }: Props & { draft: AppointmentDraft }) {
  const isNew = !draft.id;
  // Un medico gestisce solo i propri appuntamenti: per gli altri la scheda è in sola lettura.
  const editable = isNew || canWriteAppointment(user, draft.doctorId ?? "");
  const ownOnly = !canWriteAppointment(user, "");

  // In modifica restano selezionabili anche il medico e la sala attuali, se nel frattempo disattivati.
  const roomOptions = rooms.filter((room) => room.active || room.id === draft.roomId);
  const allowedDoctors = doctors.filter(
    (doctor) => (doctor.active || doctor.id === draft.doctorId) && (!ownOnly || doctor.id === user.id || !isNew),
  );

  const [patient, setPatient] = useState(draft.patient);
  const [quickQuery, setQuickQuery] = useState<string | null>(null);
  const [roomId, setRoomId] = useState(draft.roomId ?? roomOptions[0]?.id ?? "");
  const [doctorId, setDoctorId] = useState(() => {
    if (draft.doctorId) return draft.doctorId;
    if (ownOnly) return user.id;
    // Appuntamento nuovo: si parte dal primo medico della sala, se ne ha.
    const roomDoctor = roomOptions
      .find((room) => room.id === (draft.roomId ?? roomOptions[0]?.id))
      ?.doctors.find((doctor) => allowedDoctors.some((option) => option.id === doctor.id));
    return roomDoctor?.id ?? allowedDoctors[0]?.id ?? "";
  });
  const [status, setStatus] = useState<Status>(draft.status ?? "PENDING");
  const [date, setDate] = useState(format(draft.start, "yyyy-MM-dd"));
  const [start, setStart] = useState(format(draft.start, "HH:mm"));
  const [end, setEnd] = useState(format(draft.end, "HH:mm"));
  const [clientError, setClientError] = useState<string>();
  const [cancelling, startCancelling] = useTransition();

  const { state, onSubmit, pending, errors } = useFormAction(saveAppointment, {
    successMessage: isNew ? t.agenda.created : t.common.saved,
    onSuccess: onClose,
    prepare(formData) {
      const startsAt = toIso(date, start);
      const endsAt = toIso(date, end);
      if (!patient) {
        setClientError(t.errors.patientInvalid);
        return false;
      }
      if (!startsAt || !endsAt) {
        setClientError(t.errors.date);
        return false;
      }
      setClientError(undefined);
      formData.set("patientId", patient.id);
      formData.set("startsAt", startsAt);
      formData.set("endsAt", endsAt);
    },
  });

  // I medici della sala scelta vengono proposti per primi.
  const roomDoctorIds = new Set(rooms.find((room) => room.id === roomId)?.doctors.map((doctor) => doctor.id));
  const inRoom = allowedDoctors.filter((doctor) => roomDoctorIds.has(doctor.id));
  const others = allowedDoctors.filter((doctor) => !roomDoctorIds.has(doctor.id));

  function changeRoom(next: string) {
    setRoomId(next);
    if (!isNew || ownOnly) return;
    const nextDoctors = rooms.find((room) => room.id === next)?.doctors ?? [];
    // Se il medico scelto non lavora in quella sala, si passa al primo che ci lavora.
    if (nextDoctors.length > 0 && !nextDoctors.some((doctor) => doctor.id === doctorId)) {
      const first = allowedDoctors.find((doctor) => nextDoctors.some((d) => d.id === doctor.id));
      if (first) setDoctorId(first.id);
    }
  }

  if (isNew && (allowedDoctors.length === 0 || roomOptions.length === 0)) {
    return <p className="text-sm text-muted-foreground">{t.agenda.needRoomAndDoctor}</p>;
  }

  function cancelAppointment() {
    startCancelling(async () => {
      const result = await setAppointmentStatus(draft.id!, "CANCELLED");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t.common.saved);
        onClose();
      }
    });
  }

  const doctorOption = (doctor: DoctorOption) => (
    <option key={doctor.id} value={doctor.id}>
      {doctorLabel(doctor.title, doctor.name)}
    </option>
  );

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <fieldset disabled={!editable} className="contents">
        <Field label={t.agenda.patient} htmlFor="appointment-patient" className="col-span-2">
          <PatientPicker
            id="appointment-patient"
            value={patient}
            onChange={setPatient}
            onCreateNew={editable ? setQuickQuery : undefined}
            disabled={!editable}
          />
          {patient ? (
            <Link href={`/pazienti/${patient.id}`} className="text-xs text-primary hover:underline">
              {t.patients.data} →
            </Link>
          ) : null}
        </Field>
        <Field label={t.agenda.room} htmlFor="appointment-room" errors={errors.roomId}>
          <NativeSelect
            id="appointment-room"
            name="roomId"
            value={roomId}
            onChange={(event) => changeRoom(event.target.value)}
            required
          >
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t.agenda.doctor} htmlFor="appointment-doctor" errors={errors.doctorId}>
          <NativeSelect
            id="appointment-doctor"
            name="doctorId"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            required
          >
            {inRoom.length > 0 ? (
              <>
                <optgroup label={t.agenda.roomDoctors}>{inRoom.map(doctorOption)}</optgroup>
                {others.length > 0 ? <optgroup label={t.agenda.otherDoctors}>{others.map(doctorOption)}</optgroup> : null}
              </>
            ) : (
              others.map(doctorOption)
            )}
          </NativeSelect>
        </Field>
        <Field label={t.agenda.date} htmlFor="appointment-date" className="col-span-2">
          <Input
            id="appointment-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field label={t.agenda.start} htmlFor="appointment-start">
          <Input
            id="appointment-start"
            type="time"
            step={300}
            value={start}
            onChange={(event) => {
              const value = event.target.value;
              // Spostando l'inizio la durata resta la stessa.
              if (value && start && end) setEnd(addMinutes(value, Math.max(minutesOf(end) - minutesOf(start), 5)));
              setStart(value);
            }}
            required
          />
        </Field>
        <Field label={t.agenda.end} htmlFor="appointment-end" errors={errors.endsAt}>
          <Input
            id="appointment-end"
            type="time"
            step={300}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </Field>
        <div className="col-span-2 flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.agenda.status}</span>
          <StatusToggle name="status" value={status} onChange={setStatus} disabled={!editable} />
        </div>
        {isNew ? null : (
          <Field label={t.agenda.outcome} htmlFor="appointment-outcome" className="col-span-2">
            <NativeSelect id="appointment-outcome" name="outcome" defaultValue={draft.outcome ?? ""}>
              <option value="">{t.outcome.NONE}</option>
              <option value="COMPLETED">{t.outcome.COMPLETED}</option>
              <option value="NO_SHOW">{t.outcome.NO_SHOW}</option>
            </NativeSelect>
          </Field>
        )}
        <Field
          label={t.agenda.reason}
          htmlFor="appointment-reason"
          hint={editable ? t.common.optional : undefined}
          className="col-span-2"
        >
          <Textarea id="appointment-reason" name="reason" defaultValue={draft.reason ?? ""} rows={2} />
        </Field>
      </fieldset>
      <div className="col-span-2 flex flex-col gap-3">
        {editable ? null : <p className="text-sm text-muted-foreground">{t.agenda.readOnly}</p>}
        <FormError message={clientError ?? (state.ok ? undefined : state.error)} />
        <DialogFooter>
          {editable && !isNew && draft.status !== "CANCELLED" ? (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              disabled={cancelling || pending}
              onClick={cancelAppointment}
            >
              {t.agenda.cancelAppointment}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
          {editable ? <SubmitButton pending={pending}>{t.common.save}</SubmitButton> : null}
        </DialogFooter>
      </div>
      <QuickPatientDialog
        query={quickQuery}
        onClose={() => setQuickQuery(null)}
        onCreated={(created) => {
          setPatient(created);
          setClientError(undefined);
          setQuickQuery(null);
        }}
      />
    </form>
  );
}
