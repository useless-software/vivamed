"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { t } from "@/lib/messages";

export type MonthPoint = { key: string; short: string; long: string; count: number };

const HEIGHT = 200;

/** Passo "pulito" per le linee guida dell'asse (1, 2, 5, 10, 20, 50…). */
function niceStep(max: number): number {
  const rough = Math.max(1, max / 4);
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((step) => step >= rough) ?? rough;
}

/**
 * Colonne mensili (una sola serie: niente legenda, il titolo dice cosa c'è).
 * Colonne sottili con l'estremità arrotondata, linee guida leggere, tooltip al
 * passaggio del mouse o al focus da tastiera, e la tabella con gli stessi dati.
 */
export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((point) => point.count), 0);
  const step = niceStep(max);
  const top = Math.max(step * Math.ceil(max / step), step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const last = data.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex gap-2" style={{ height: HEIGHT + 24 }}>
        {/* Asse Y */}
        <div className="relative w-8 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums" style={{ height: HEIGHT }}>
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 translate-y-1/2" style={{ bottom: (tick / top) * HEIGHT }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* Linee guida: sottili, continue, discrete. */}
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: (tick / top) * HEIGHT + 24 - 1 }}
            />
          ))}
          <div className="absolute inset-x-0 top-0 flex items-end" style={{ height: HEIGHT }}>
            {data.map((point, index) => {
              const height = point.count === 0 ? 0 : Math.max((point.count / top) * HEIGHT, 3);
              const isActive = active === index;
              return (
                <button
                  key={point.key}
                  type="button"
                  aria-label={`${point.long}: ${point.count} ${t.home.appointments.toLowerCase()}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  // L'area sensibile è tutta la colonna, più larga della barra.
                  className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-muted/60"
                >
                  {/* Valore solo sull'ultimo mese (il più interessante) o su quello evidenziato. */}
                  {(index === last && active === null) || isActive ? (
                    <span
                      className="absolute text-xs font-semibold text-foreground tabular-nums"
                      style={{ bottom: height + 4 }}
                    >
                      {point.count}
                    </span>
                  ) : null}
                  <motion.span
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height }}
                    transition={{ delay: 0.15 + index * 0.04, type: "spring", stiffness: 140, damping: 18 }}
                    className="block w-[min(24px,70%)] rounded-t-[4px] bg-primary transition-opacity"
                    style={{ opacity: active === null || isActive ? 1 : 0.45 }}
                  />
                </button>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 text-[11px] text-muted-foreground">
            {data.map((point, index) => (
              <span
                key={point.key}
                className={`flex-1 text-center capitalize ${index === last ? "font-semibold text-foreground" : ""}`}
              >
                {point.short}
              </span>
            ))}
          </div>
          {active !== null ? (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md"
              style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <span className="block font-medium capitalize">{data[active].long}</span>
              <span className="text-muted-foreground">
                {data[active].count} {t.home.appointments.toLowerCase()}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t.home.chartTable}</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1 font-medium">{t.home.month}</th>
              <th className="py-1 text-right font-medium">{t.home.appointments}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.key} className="border-b last:border-0">
                <td className="py-1 capitalize">{point.long}</td>
                <td className="py-1 text-right tabular-nums">{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
