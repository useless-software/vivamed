"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/messages";
import { searchPatients, type PatientOption } from "@/server/actions/patients";
import type { PatientRef } from "./types";

/** Selettore paziente con ricerca lato server (l'anagrafica può essere grande). */
export function PatientPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PatientRef | null;
  onChange: (patient: PatientRef | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientOption[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);

  function search(text: string) {
    setQuery(text);
    clearTimeout(timer.current);
    if (text.trim().length < 2) {
      latest.current += 1;
      setResults(null);
      return;
    }
    // Piccola attesa per non interrogare il server a ogni tasto.
    timer.current = setTimeout(async () => {
      const request = ++latest.current;
      const found = await searchPatients(text);
      // Ignora le risposte arrivate in ritardo rispetto a una ricerca più recente.
      if (request === latest.current) setResults(found);
    }, 200);
  }

  if (value) {
    return (
      <div className="flex h-8 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 pr-1 pl-2.5 text-sm">
        <span id={id} className="truncate font-medium">
          {value.label}
        </span>
        {disabled ? null : (
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange(null)}>
            {t.agenda.patientChange}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={query}
        onChange={(event) => search(event.target.value)}
        placeholder={t.agenda.patientSearch}
        autoComplete="off"
        autoFocus
      />
      {results ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md">
          {results.length === 0 ? (
            <li className="px-2 py-1.5 text-muted-foreground">{t.agenda.patientNone}</li>
          ) : (
            results.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    onChange({ id: patient.id, label: patient.label });
                    setQuery("");
                    setResults(null);
                  }}
                >
                  <span className="font-medium">{patient.label}</span>
                  <span className="text-xs text-muted-foreground">{patient.detail}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
