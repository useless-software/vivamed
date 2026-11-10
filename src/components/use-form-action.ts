"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/validation";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Collega un form a una Server Action.
 *
 * Usiamo `onSubmit` invece di `<form action>` perché React, dopo una action,
 * svuota i campi non controllati: con un errore di validazione l'utente
 * perderebbe tutto ciò che ha scritto.
 */
export function useFormAction(
  action: FormAction,
  options: {
    successMessage?: string;
    onSuccess?: () => void;
    /** Riceve la risposta completa della Server Action (anche in caso di errore). */
    onResult?: (result: ActionState) => void;
    /** Ultimo ritocco ai dati prima dell'invio; restituisce false per annullare. */
    prepare?: (formData: FormData) => boolean | void;
  } = {},
) {
  const [state, dispatch, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    options.onResult?.(result);
    if (result.ok) {
      if (options.successMessage) toast.success(options.successMessage);
      options.onSuccess?.();
    }
    return result;
  }, {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Un form dentro un popup aperto da un altro form (es. nuovo paziente dal form
    // appuntamento): in React l'evento risalirebbe fino al form esterno.
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    if (options.prepare?.(formData) === false) return;
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending, errors: state.fieldErrors ?? {} };
}
