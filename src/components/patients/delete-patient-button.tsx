"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/messages";
import { deletePatient } from "@/server/actions/patients";

export function DeletePatientButton({
  patientId,
  name,
  appointments,
  documents,
}: {
  patientId: string;
  name: string;
  appointments: number;
  documents: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // In caso di successo l'azione porta all'elenco pazienti.
      const result = await deletePatient(patientId);
      if (result?.error) toast.error(result.error);
      else toast.success(t.patients.deleted);
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2Icon /> {t.patients.delete}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.patients.deleteTitle}</DialogTitle>
            <DialogDescription>{t.patients.deleteText(name, appointments, documents)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirm}
              disabled={pending}
            >
              {t.patients.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
