"use client";

import { useRef, useState } from "react";
import { UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/messages";
import { searchPatients, type PatientOption } from "@/server/actions/patients";
import type { PatientRef } from "./types";

/**
 * Selettore paziente con ricerca lato server (l'anagrafica può essere grande).
 * In cima all'elenco c'è sempre "Nuovo paziente", anche quando ci sono risultati:
 * chiama `onCreateNew` con il testo digitato, per precompilare il nuovo paziente.
 */
export function PatientPicker({
  id,
  value,
  onChange,
  onCreateNew,
  disabled,
}: {
  id: string;
  value: PatientRef | null;
  onChange: (patient: PatientRef | null) => void;
  onCreateNew?: (query: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PatientOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0);

  function search(text: string) {
    setQuery(text);
    setOpen(true);
    clearTimeout(timer.current);
    if (text.trim().length < 2) {
      latest.current += 1;
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Piccola attesa per non interrogare il server a ogni tasto.
    timer.current = setTimeout(async () => {
      const request = ++latest.current;
      const found = await searchPatients(text);
      // Ignora le risposte arrivate in ritardo rispetto a una ricerca più recente.
      if (request === latest.current) {
        setResults(found);
        setSearching(false);
      }
    }, 200);
  }

  if (value) {
    return (
      <div className="flex h-8 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 pr-1 pl-2.5 text-sm animate-in fade-in-0 zoom-in-95">
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
    <div
      className="relative"
      onBlur={(event) => {
        // Chiude l'elenco quando il fuoco esce dal selettore (ma non cliccando al suo interno).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Input
        id={id}
        value={query}
        onChange={(event) => search(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={t.agenda.patientSearch}
        autoComplete="off"
        autoFocus
        role="combobox"
        aria-expanded={open}
      />
      {open ? (
        <div
          // Il clic nell'elenco non deve togliere il fuoco al campo di ricerca: Safari
          // (e Firefox su Mac) non danno il fuoco ai pulsanti, quindi l'elenco si
          // chiuderebbe per il "blur" prima che il clic arrivi al pulsante.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-sm shadow-md animate-in fade-in-0 slide-in-from-top-1"
        >
          {onCreateNew ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 border-b bg-primary/5 px-3 py-2 text-left font-medium text-primary hover:bg-primary/10"
              onClick={() => {
                setOpen(false);
                onCreateNew(query);
              }}
            >
              <span className="flex items-center">
                <UserPlusIcon className="size-4" />
              </span>
              {t.patients.quickNew}
              {query.trim() ? <span className="truncate font-normal text-muted-foreground">“{query.trim()}”</span> : null}
            </button>
          ) : null}
          {results || searching ? (
            <ul className="max-h-56 overflow-auto p-1">
              {searching && !results ? (
                <li className="px-2 py-1.5 text-muted-foreground">{t.app.loading}</li>
              ) : results && results.length === 0 ? (
                <li className="px-2 py-1.5 text-muted-foreground">{t.agenda.patientNone}</li>
              ) : (
                results?.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => {
                        onChange({ id: patient.id, label: patient.label });
                        setQuery("");
                        setResults(null);
                        setOpen(false);
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
      ) : null}
    </div>
  );
}
