"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import { setup } from "@/server/actions/auth";

export function SetupForm() {
  const { state, onSubmit, pending, errors } = useFormAction(setup);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.setupTitle}</CardTitle>
        <CardDescription>{t.auth.setupSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t.auth.name} htmlFor="name" errors={errors.name}>
            <Input id="name" name="name" autoComplete="name" required autoFocus />
          </Field>
          <Field label={t.auth.email} htmlFor="email" errors={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label={t.auth.password} htmlFor="password" errors={errors.password} hint={t.auth.passwordHint}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label={t.auth.passwordConfirm} htmlFor="passwordConfirm" errors={errors.passwordConfirm}>
            <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
          </Field>
          <FormError message={state.error} />
          <SubmitButton pending={pending} size="lg">{t.auth.setupSubmit}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
