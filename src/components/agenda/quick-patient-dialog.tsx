"use client";

import { PatientForm, type PatientFormValues } from "@/app/(app)/pazienti/patient-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/messages";
import type { PatientRef } from "./types";

/**
 * Indovina i campi dal testo digitato nella ricerca: un'email, un telefono,
 * un codice fiscale, oppure "Cognome Nome".
 */
export function guessPatientFields(query: string): Partial<PatientFormValues> {
  const text = query.trim().replace(/\s+/g, " ");
  if (!text) return {};
  if (text.includes("@")) return { email: text };
  if (/^\+?[\d\s/.-]{5,}$/.test(text)) return { phone: text };
  if (/^[a-z0-9]{16}$/i.test(text)) return { fiscalCode: text.toUpperCase() };
  const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  const [lastName, ...rest] = text.split(" ").map(capitalize);
  return { lastName, firstName: rest.join(" ") };
}

/** Popup "Nuovo paziente" aperto sopra il form appuntamento, che resta intatto sotto. */
export function QuickPatientDialog({
  query,
  onCreated,
  onClose,
}: {
  /** null = popup chiuso. */
  query: string | null;
  onCreated: (patient: PatientRef) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={query !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.patients.quickNew}</DialogTitle>
        </DialogHeader>
        {query !== null ? (
          <PatientForm initial={guessPatientFields(query)} onCreated={onCreated} onCancel={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
