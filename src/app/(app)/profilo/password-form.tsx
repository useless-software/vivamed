"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import { changePassword } from "@/server/actions/auth";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending, errors } = useFormAction(changePassword, {
    successMessage: t.profile.passwordChanged,
    onSuccess: () => formRef.current?.reset(),
  });
  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label={t.profile.currentPassword} htmlFor="currentPassword" errors={errors.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={t.profile.newPassword} htmlFor="password" errors={errors.password} hint={t.auth.passwordHint}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={t.auth.passwordConfirm} htmlFor="passwordConfirm" errors={errors.passwordConfirm}>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.ok ? null : <FormError message={state.error} />}
      <SubmitButton pending={pending} className="self-start">{t.common.save}</SubmitButton>
    </form>
  );
}
