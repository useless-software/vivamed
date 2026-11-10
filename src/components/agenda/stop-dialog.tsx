"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox, Field, FormError, NativeSelect, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { doctorLabel } from "@/lib/doctors";
import { t } from "@/lib/messages";
import { canWriteAppointment, type Role } from "@/lib/permissions";
import { deleteStop, saveStop } from "@/server/actions/stops";
import type { DoctorOption, RoomOption } from "./types";

export type StopDraft = {
  id?: string;
  start: Date;
  end: Date;
  roomId?: string;
  doctorIds?: string[];
  note?: string;
};

type Props = {
  draft: StopDraft | null;
  doctors: DoctorOption[];
  rooms: RoomOption[];
  user: { id: string; role: Role };
  onClose: () => void;
};

export function StopDialog({ draft, onClose, ...rest }: Props) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden className="barber-pole inline-block h-4 w-8 rounded-sm" style={{ ["--stop-color" as string]: "var(--primary)" }} />
            {draft?.id ? t.stops.edit : t.stops.new}
          </DialogTitle>
        </DialogHeader>
        {draft ? <StopForm key={draft.id ?? "new"} draft={draft} onClose={onClose} {...rest} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function toIso(date: string, time: string): string | null {
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function StopForm({ draft, doctors, rooms, user, onClose }: Props & { draft: StopDraft }) {
  const isNew = !draft.id;
  const ownOnly = !canWriteAppointment(user, "");
  const roomOptions = rooms.filter((room) => room.active || room.id === draft.roomId);
  const doctorOptions = doctors.filter(
    (doctor) => (doctor.active || draft.doctorIds?.includes(doctor.id)) && (!ownOnly || doctor.id === user.id),
  );
  // Un medico può modificare solo gli stop che riguardano soltanto lui.
  const editable = !ownOnly || (draft.doctorIds ?? [user.id]).every((id) => id === user.id);

  const roomDoctors = (roomId: string) =>
    rooms
      .find((room) => room.id === roomId)
      ?.doctors.map((doctor) => doctor.id)
      .filter((id) => doctorOptions.some((option) => option.id === id)) ?? [];

  const initialRoom = draft.roomId ?? roomOptions[0]?.id ?? "";
  const [roomId, setRoomId] = useState(initialRoom);
  // Nuovo stop: si parte dai medici della sala (o da sé stessi, per un medico).
  const [doctorIds, setDoctorIds] = useState<string[]>(
    () => draft.doctorIds ?? (ownOnly ? [user.id] : roomDoctors(initialRoom)),
  );
  const [date, setDate] = useState(format(draft.start, "yyyy-MM-dd"));
  const [start, setStart] = useState(format(draft.start, "HH:mm"));
  const [end, setEnd] = useState(format(draft.end, "HH:mm"));
  const [clientError, setClientError] = useState<string>();
  const [deleting, startDeleting] = useTransition();

  const { state, onSubmit, pending, errors } = useFormAction(saveStop, {
    successMessage: isNew ? t.stops.created : t.common.saved,
    onSuccess: onClose,
    prepare(formData) {
      const startsAt = toIso(date, start);
      const endsAt = toIso(date, end);
      if (!startsAt || !endsAt) {
        setClientError(t.errors.date);
        return false;
      }
      setClientError(undefined);
      formData.set("startsAt", startsAt);
      formData.set("endsAt", endsAt);
    },
  });

  function changeRoom(next: string) {
    setRoomId(next);
    if (isNew && !ownOnly) setDoctorIds(roomDoctors(next));
  }

  function toggleDoctor(id: string, checked: boolean) {
    setDoctorIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  }

  function remove() {
    if (!window.confirm(t.stops.deleteConfirm)) return;
    startDeleting(async () => {
      const result = await deleteStop(draft.id!);
      if (result.error) toast.error(result.error);
      else {
        toast.success(t.stops.deleted);
        onClose();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
      {draft.id ? <input type="hidden" name="id" value={draft.id} /> : null}
      <fieldset disabled={!editable} className="contents">
        <Field label={t.stops.note} htmlFor="stop-note" errors={errors.note} className="col-span-2">
          <Textarea
            id="stop-note"
            name="note"
            defaultValue={draft.note}
            placeholder={t.stops.notePlaceholder}
            rows={2}
            required
            autoFocus
          />
        </Field>
        <Field label={t.agenda.room} htmlFor="stop-room" errors={errors.roomId} className="col-span-2">
          <NativeSelect
            id="stop-room"
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
        <fieldset className="col-span-2 flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">{t.stops.doctors}</legend>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
            {doctorOptions.map((doctor) => (
              <Checkbox
                key={doctor.id}
                name="doctorIds"
                value={doctor.id}
                label={doctorLabel(doctor.title, doctor.name)}
                checked={doctorIds.includes(doctor.id)}
                onChange={(event) => toggleDoctor(doctor.id, event.target.checked)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t.stops.doctorsHint}</p>
        </fieldset>
        <Field label={t.agenda.date} htmlFor="stop-date" className="col-span-2">
          <Input id="stop-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label={t.agenda.start} htmlFor="stop-start">
          <Input
            id="stop-start"
            type="time"
            step={300}
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </Field>
        <Field label={t.agenda.end} htmlFor="stop-end" errors={errors.endsAt}>
          <Input id="stop-end" type="time" step={300} value={end} onChange={(event) => setEnd(event.target.value)} required />
        </Field>
      </fieldset>
      <div className="col-span-2 flex flex-col gap-3">
        {editable ? null : <p className="text-sm text-muted-foreground">{t.agenda.readOnly}</p>}
        <FormError message={clientError ?? (state.ok ? undefined : state.error)} />
        <DialogFooter>
          {editable && !isNew ? (
            <Button type="button" variant="destructive" className="sm:mr-auto" disabled={deleting || pending} onClick={remove}>
              <Trash2Icon /> {t.stops.delete}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.close}
          </Button>
          {editable ? <SubmitButton pending={pending}>{t.common.save}</SubmitButton> : null}
        </DialogFooter>
      </div>
    </form>
  );
}
