"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/messages";

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {errors?.length ? (
        <p className="text-xs text-destructive" role="alert">
          {errors[0]}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pending = false,
  pendingLabel = t.common.saving,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** <select> nativo con lo stesso aspetto degli Input: funziona con FormData senza JavaScript extra. */
export function NativeSelect({
  className,
  autoSubmit,
  ...props
}: ComponentProps<"select"> & {
  /** Invia il form appena cambia il valore (utile per ordinamenti e filtri). */
  autoSubmit?: boolean;
}) {
  return (
    <select
      onChange={autoSubmit ? (event) => event.currentTarget.form?.requestSubmit() : undefined}
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-primary" {...props} />
      {label}
    </label>
  );
}
