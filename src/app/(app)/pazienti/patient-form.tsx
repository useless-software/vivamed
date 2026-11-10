"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { BirthPlacePicker, type BirthPlace } from "@/components/patients/birth-place-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, NativeSelect, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { computeFiscalCode } from "@/lib/codice-fiscale";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { savePatient } from "@/server/actions/patients";

export type PatientFormValues = {
  id: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  sex: "" | "M" | "F";
  birthDate: string;
  birthPlace: BirthPlace | null;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type Props = {
  patient?: PatientFormValues;
  /** Valori iniziali per un paziente nuovo (es. il testo già digitato nella ricerca). */
  initial?: Partial<PatientFormValues>;
  /**
   * Modalità "in linea" (popup dal form appuntamento): niente cambio pagina, il
   * paziente creato viene passato a `onCreated`.
   */
  onCreated?: (patient: { id: string; label: string }) => void;
  onCancel?: () => void;
};

export function PatientForm({ patient, initial, onCreated, onCancel }: Props) {
  const inline = Boolean(onCreated);
  const formRef = useRef<HTMLFormElement>(null);
  const fiscalRef = useRef<HTMLInputElement>(null);
  const values = patient ?? initial;
  const [birthPlace, setBirthPlace] = useState<BirthPlace | null>(values?.birthPlace ?? null);

  const { state, onSubmit, pending, errors } = useFormAction(savePatient, {
    successMessage: inline ? t.patients.quickCreated : t.common.saved,
    onResult: (result) => {
      if (onCreated && result.created) onCreated(result.created);
    },
  });

  function computeCf() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const sex = String(data.get("sex") ?? "");
    const birthDate = String(data.get("birthDate") ?? "");
    if (!firstName || !lastName || (sex !== "M" && sex !== "F") || !birthDate || !birthPlace) {
      toast.error(t.errors.cfMissing);
      return;
    }
    try {
      const code = computeFiscalCode({
        firstName,
        lastName,
        sex,
        birthDate: new Date(`${birthDate}T00:00:00.000Z`),
        birthPlaceCode: birthPlace.code,
      });
      if (fiscalRef.current) fiscalRef.current.value = code;
      toast.success(t.patients.fiscalCodeComputed);
    } catch {
      toast.error(t.errors.cfMissing);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {patient ? <input type="hidden" name="id" value={patient.id} /> : null}
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      <Field label={t.patients.firstName} htmlFor="firstName" errors={errors.firstName}>
        <Input id="firstName" name="firstName" defaultValue={values?.firstName} required autoFocus={!patient} />
      </Field>
      <Field label={t.patients.lastName} htmlFor="lastName" errors={errors.lastName}>
        <Input id="lastName" name="lastName" defaultValue={values?.lastName} required />
      </Field>
      <Field label={t.patients.sex} htmlFor="sex" errors={errors.sex}>
        <NativeSelect id="sex" name="sex" defaultValue={values?.sex ?? ""}>
          <option value="">{t.patients.sexNone}</option>
          <option value="M">{t.sex.M}</option>
          <option value="F">{t.sex.F}</option>
        </NativeSelect>
      </Field>
      <Field label={t.patients.birthDate} htmlFor="birthDate" errors={errors.birthDate}>
        <Input id="birthDate" name="birthDate" type="date" defaultValue={values?.birthDate} />
      </Field>
      <Field label={t.patients.birthPlace} htmlFor="birthPlace" errors={errors.birthPlaceCode} className="sm:col-span-2">
        <BirthPlacePicker id="birthPlace" value={birthPlace} onChange={setBirthPlace} />
      </Field>
      <Field
        label={t.patients.fiscalCode}
        htmlFor="fiscalCode"
        errors={errors.fiscalCode}
        hint={t.patients.computeFiscalCodeHint}
        className="sm:col-span-2"
      >
        <div className="flex gap-2">
          <Input
            ref={fiscalRef}
            id="fiscalCode"
            name="fiscalCode"
            defaultValue={values?.fiscalCode}
            maxLength={16}
            className="font-mono uppercase"
            autoComplete="off"
          />
          <Button type="button" variant="outline" onClick={computeCf}>
            <SparklesIcon /> {t.patients.computeFiscalCode}
          </Button>
        </div>
      </Field>
      <Field label={t.patients.phone} htmlFor="phone" errors={errors.phone} hint={t.common.optional}>
        <Input id="phone" name="phone" type="tel" defaultValue={values?.phone} />
      </Field>
      <Field label={t.patients.email} htmlFor="email" errors={errors.email} hint={t.common.optional}>
        <Input id="email" name="email" type="email" defaultValue={values?.email} />
      </Field>
      <Field
        label={t.patients.address}
        htmlFor="address"
        errors={errors.address}
        hint={t.common.optional}
        className={cn("sm:col-span-2", inline && "hidden")}
      >
        <Input id="address" name="address" defaultValue={values?.address} />
      </Field>
      <Field
        label={t.patients.notes}
        htmlFor="notes"
        errors={errors.notes}
        hint={t.common.optional}
        className={cn("sm:col-span-2", inline && "hidden")}
      >
        <Textarea id="notes" name="notes" defaultValue={values?.notes} rows={3} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        {state.ok ? null : <FormError message={state.error} />}
        <div className="flex justify-end gap-2 sm:justify-start">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t.common.cancel}
            </Button>
          ) : patient ? null : (
            <Link href="/pazienti" className={buttonVariants({ variant: "outline" })}>
              {t.common.cancel}
            </Link>
          )}
          <SubmitButton pending={pending}>{t.common.save}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
