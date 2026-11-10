"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox, Field, FormError, NativeSelect, SubmitButton } from "@/components/form";
import { useFormAction } from "@/components/use-form-action";
import type { DoctorTitle } from "@/lib/doctors";
import { t } from "@/lib/messages";
import type { Role } from "@/lib/permissions";
import { createUser, updateUser } from "@/server/actions/users";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  title: DoctorTitle;
  active: boolean;
  hasPassword: boolean;
};

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
  const [role, setRole] = useState<Role>(user?.role ?? "RECEPTION");
  const [email, setEmail] = useState(user?.email ?? "");
  const isDoctor = role === "DOCTOR";
  // La password serve solo se c'è l'email; in modifica, solo se manca o va cambiata.
  const passwordRequired = email.trim() !== "" && !user?.hasPassword;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <Field label={t.users.role} htmlFor="user-role" errors={errors.role}>
        <NativeSelect id="user-role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {(Object.keys(t.roles) as Role[]).map((value) => (
            <option key={value} value={value}>
              {t.roles[value]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className={isDoctor ? "grid grid-cols-[8rem_1fr] gap-3" : undefined}>
        {isDoctor ? (
          <Field label={t.users.titleLabel} htmlFor="user-title" errors={errors.title}>
            <NativeSelect id="user-title" name="title" defaultValue={user?.title ?? "DOTT"}>
              {(Object.keys(t.titles) as DoctorTitle[]).map((value) => (
                <option key={value} value={value}>
                  {t.titles[value]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label={t.auth.name} htmlFor="user-name" errors={errors.name}>
          <Input id="user-name" name="name" defaultValue={user?.name} required />
        </Field>
      </div>
      <Field
        label={t.auth.email}
        htmlFor="user-email"
        errors={errors.email}
        hint={isDoctor ? t.users.emailOptionalHint : undefined}
      >
        <Input
          id="user-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={!isDoctor}
        />
      </Field>
      {email.trim() !== "" ? (
        <Field
          label={user?.hasPassword ? t.users.newPassword : t.auth.password}
          htmlFor="user-password"
          errors={errors.password}
          hint={user?.hasPassword ? t.users.newPasswordHint : t.auth.passwordHint}
        >
          <Input
            id="user-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required={passwordRequired}
            minLength={8}
          />
        </Field>
      ) : null}
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
