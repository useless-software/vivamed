"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormError, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import { login } from "@/server/actions/auth";

export function LoginForm() {
  const { state, onSubmit, pending } = useFormAction(login);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.auth.loginTitle}</CardTitle>
        <CardDescription>{t.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t.auth.email} htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          </Field>
          <Field label={t.auth.password} htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <FormError message={state.error} />
          <SubmitButton pending={pending} pendingLabel={t.auth.loggingIn} size="lg">
            {t.auth.login}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
