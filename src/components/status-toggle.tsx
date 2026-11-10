"use client";

import { STATUS_ORDER, STATUS_STYLE, type AppointmentStatus } from "@/components/status-style";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * Selettore a tre posizioni (In sospeso / Confermato / Disdetto) con un
 * cursore colorato che scorre sotto l'opzione scelta.
 */
export function StatusToggle({
  value,
  onChange,
  name,
  disabled,
  compact,
  label = t.agenda.status,
}: {
  value: AppointmentStatus;
  onChange: (status: AppointmentStatus) => void;
  /** Se presente, il valore viene inviato con il form in un campo nascosto. */
  name?: string;
  disabled?: boolean;
  /** Solo icone (per le liste). */
  compact?: boolean;
  label?: string;
}) {
  const index = STATUS_ORDER.indexOf(value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-grid grid-cols-3 rounded-full border bg-muted/60 p-0.5 select-none",
        compact ? "w-[6.5rem]" : "w-full",
        disabled && "opacity-60",
      )}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {/* Il cursore: un terzo della larghezza, spostato sotto l'opzione attiva. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-full shadow-sm transition-[transform,background-color] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
          STATUS_STYLE[value].solid,
        )}
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {STATUS_ORDER.map((status) => {
        const { icon: Icon } = STATUS_STYLE[status];
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.status[status]}
            title={t.status[status]}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "h-7" : "h-8 px-2",
              active ? "text-white" : cn(STATUS_STYLE[status].text, "hover:bg-background/70"),
            )}
          >
            <Icon className={cn("size-4 transition-transform", active && "scale-110")} strokeWidth={2.5} />
            {compact ? null : <span className="truncate">{t.status[status]}</span>}
          </button>
        );
      })}
    </div>
  );
}
