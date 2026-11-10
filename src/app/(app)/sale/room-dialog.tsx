"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox, Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { doctorLabel, type DoctorTitle } from "@/lib/doctors";
import { t } from "@/lib/messages";
import { saveRoom } from "@/server/actions/rooms";

type DoctorOption = { id: string; name: string; title: DoctorTitle; active: boolean };
type RoomRow = { id: string; name: string; color: string; active: boolean; doctors: { id: string }[] };

export function RoomDialog({ room, doctors }: { room?: RoomRow; doctors: DoctorOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {room ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.common.edit}
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> {t.rooms.new}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{room ? t.rooms.edit : t.rooms.new}</DialogTitle>
          </DialogHeader>
          {open ? <RoomForm room={room} doctors={doctors} onDone={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RoomForm({ room, doctors, onDone }: { room?: RoomRow; doctors: DoctorOption[]; onDone: () => void }) {
  const assigned = new Set(room?.doctors.map((doctor) => doctor.id));
  // I medici disattivati compaiono solo se erano già assegnati, per poterli togliere.
  const options = doctors.filter((doctor) => doctor.active || assigned.has(doctor.id));
  const { state, onSubmit, pending, errors } = useFormAction(saveRoom, {
    successMessage: room ? t.common.saved : t.rooms.created,
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {room ? <input type="hidden" name="id" value={room.id} /> : null}
      <Field label={t.rooms.name} htmlFor="room-name" errors={errors.name}>
        <Input id="room-name" name="name" defaultValue={room?.name} required />
      </Field>
      <Field label={t.rooms.color} htmlFor="room-color" errors={errors.color}>
        <input
          id="room-color"
          name="color"
          type="color"
          defaultValue={room?.color ?? "#3b82f6"}
          className="h-8 w-16 cursor-pointer rounded-lg border border-input bg-background p-1"
        />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">{t.rooms.doctors}</legend>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.rooms.noDoctors}</p>
        ) : (
          <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
            {options.map((doctor) => (
              <Checkbox
                key={doctor.id}
                name="doctorIds"
                value={doctor.id}
                label={doctorLabel(doctor.title, doctor.name)}
                defaultChecked={assigned.has(doctor.id)}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t.rooms.doctorsHint}</p>
      </fieldset>
      {room ? <Checkbox name="active" label={t.rooms.activeLabel} defaultChecked={room.active} /> : null}
      <FormError message={state.error} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <SubmitButton pending={pending}>{t.common.save}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
