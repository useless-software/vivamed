"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox, Field, FormError, NativeSelect, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import { t } from "@/lib/messages";
import type { Role } from "@/lib/permissions";
import { createUser, updateUser } from "@/server/actions/users";

type UserRow = { id: string; name: string; email: string; role: Role; active: boolean };

export function UserDialog({ user }: { user?: UserRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {user ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.common.edit}
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon /> {t.users.new}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user ? t.users.edit : t.users.new}</DialogTitle>
          </DialogHeader>
          {/* Montato solo ad apertura: ogni volta il form riparte pulito. */}
          {open ? <UserForm user={user} onDone={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserForm({ user, onDone }: { user?: UserRow; onDone: () => void }) {
  const { state, onSubmit, pending, errors } = useFormAction(user ? updateUser : createUser, {
    successMessage: user ? t.common.saved : t.users.created,
    onSuccess: onDone,
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <Field label={t.auth.name} htmlFor="user-name" errors={errors.name}>
        <Input id="user-name" name="name" defaultValue={user?.name} required />
      </Field>
      <Field label={t.auth.email} htmlFor="user-email" errors={errors.email}>
        <Input id="user-email" name="email" type="email" defaultValue={user?.email} required />
      </Field>
      <Field label={t.users.role} htmlFor="user-role" errors={errors.role}>
        <NativeSelect id="user-role" name="role" defaultValue={user?.role ?? "RECEPTION"}>
          {(Object.keys(t.roles) as Role[]).map((role) => (
            <option key={role} value={role}>
              {t.roles[role]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label={user ? t.users.newPassword : t.auth.password}
        htmlFor="user-password"
        errors={errors.password}
        hint={user ? t.users.newPasswordHint : t.auth.passwordHint}
      >
        <Input
          id="user-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={!user}
          minLength={8}
        />
      </Field>
      {user ? <Checkbox name="active" label={t.users.activeLabel} defaultChecked={user.active} /> : null}
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
