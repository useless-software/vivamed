"use client";

import { useRef, useState } from "react";
import { MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/messages";
import { searchBirthPlaces } from "@/server/actions/patients";

export type BirthPlace = { label: string; code: string };

const CODE = /^[A-Z]\d{3}$/;

/**
 * Selettore del luogo di nascita: cerca tra i comuni italiani oppure accetta
 * direttamente un codice catastale (es. "Z404" per chi è nato all'estero).
 * Invia i campi nascosti `birthPlace` e `birthPlaceCode`.
 */
export function BirthPlacePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: BirthPlace | null;
  onChange: (place: BirthPlace | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BirthPlace[] | null>(null);
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
    timer.current = setTimeout(async () => {
      const request = ++latest.current;
      const found = await searchBirthPlaces(text);
      if (request === latest.current) setResults(found);
    }, 150);
  }

  function choose(place: BirthPlace) {
    onChange(place);
    setQuery("");
    setResults(null);
  }

  const typedCode = query.trim().toUpperCase();

  return (
    <div className="relative">
      <input type="hidden" name="birthPlace" value={value?.label ?? ""} />
      <input type="hidden" name="birthPlaceCode" value={value?.code ?? ""} />
      {value ? (
        <div className="flex h-8 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 pr-1 pl-2.5 text-sm">
          <span id={id} className="flex items-center gap-1.5 truncate">
            <MapPinIcon className="size-3.5 text-muted-foreground" />
            {value.label}
            <span className="font-mono text-xs text-muted-foreground">{value.code}</span>
          </span>
          <Button type="button" variant="ghost" size="xs" onClick={() => onChange(null)}>
            {t.patients.birthPlaceChange}
          </Button>
        </div>
      ) : (
        <Input
          id={id}
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={(event) => {
            // Invio su un codice valido lo usa direttamente, senza inviare il form.
            if (event.key === "Enter" && results !== null) {
              event.preventDefault();
              if (CODE.test(typedCode)) choose({ label: typedCode, code: typedCode });
              else if (results[0]) choose(results[0]);
            }
          }}
          placeholder={t.patients.birthPlacePlaceholder}
          autoComplete="off"
        />
      )}
      {!value && results ? (
        <ul
          // Come nel selettore paziente: il clic non toglie il fuoco al campo.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {CODE.test(typedCode) ? (
            <li>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left font-medium hover:bg-muted"
                onClick={() => choose({ label: typedCode, code: typedCode })}
              >
                {t.patients.birthPlaceUseCode(typedCode)}
              </button>
            </li>
          ) : null}
          {results.length === 0 && !CODE.test(typedCode) ? (
            <li className="px-2 py-1.5 text-muted-foreground">{t.patients.birthPlaceNone}</li>
          ) : (
            results.map((place) => (
              <li key={place.code}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => choose(place)}
                >
                  <span>{place.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{place.code}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
