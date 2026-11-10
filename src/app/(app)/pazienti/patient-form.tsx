"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import { savePatient } from "@/server/actions/patients";

export type PatientFormValues = {
  id: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function PatientForm({ patient }: { patient?: PatientFormValues }) {
  const { state, onSubmit, pending, errors } = useFormAction(savePatient, {
    successMessage: t.common.saved,
  });
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {patient ? <input type="hidden" name="id" value={patient.id} /> : null}
      <Field label={t.patients.firstName} htmlFor="firstName" errors={errors.firstName}>
        <Input id="firstName" name="firstName" defaultValue={patient?.firstName} required autoFocus={!patient} />
      </Field>
      <Field label={t.patients.lastName} htmlFor="lastName" errors={errors.lastName}>
        <Input id="lastName" name="lastName" defaultValue={patient?.lastName} required />
      </Field>
      <Field label={t.patients.fiscalCode} htmlFor="fiscalCode" errors={errors.fiscalCode} hint={t.common.optional}>
        <Input
          id="fiscalCode"
          name="fiscalCode"
          defaultValue={patient?.fiscalCode}
          maxLength={16}
          className="uppercase"
          autoComplete="off"
        />
      </Field>
      <Field label={t.patients.birthDate} htmlFor="birthDate" errors={errors.birthDate} hint={t.common.optional}>
        <Input id="birthDate" name="birthDate" type="date" defaultValue={patient?.birthDate} />
      </Field>
      <Field label={t.patients.phone} htmlFor="phone" errors={errors.phone} hint={t.common.optional}>
        <Input id="phone" name="phone" type="tel" defaultValue={patient?.phone} />
      </Field>
      <Field label={t.patients.email} htmlFor="email" errors={errors.email} hint={t.common.optional}>
        <Input id="email" name="email" type="email" defaultValue={patient?.email} />
      </Field>
      <Field
        label={t.patients.address}
        htmlFor="address"
        errors={errors.address}
        hint={t.common.optional}
        className="sm:col-span-2"
      >
        <Input id="address" name="address" defaultValue={patient?.address} />
      </Field>
      <Field
        label={t.patients.notes}
        htmlFor="notes"
        errors={errors.notes}
        hint={t.common.optional}
        className="sm:col-span-2"
      >
        <Textarea id="notes" name="notes" defaultValue={patient?.notes} rows={3} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        {state.ok ? null : <FormError message={state.error} />}
        <div className="flex gap-2">
          <SubmitButton pending={pending}>{t.common.save}</SubmitButton>
          {patient ? null : (
            <Link href="/pazienti" className={buttonVariants({ variant: "outline" })}>
              {t.common.cancel}
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
