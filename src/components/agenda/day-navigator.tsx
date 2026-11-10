"use client";

import { useEffect, useRef } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarSearchIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

/** Quanti giorni mostrare prima e dopo quello scelto nella striscia. */
const SPAN = 7;

function relativeLabel(day: Date, today: Date): string | null {
  const diff = differenceInCalendarDays(day, today);
  if (diff === 0) return t.agenda.today;
  if (diff === 1) return t.agenda.tomorrow;
  if (diff === -1) return t.agenda.yesterday;
  return diff > 0 ? t.agenda.inDays(diff) : t.agenda.daysAgo(-diff);
}

/**
 * Navigazione tra i giorni: titolo con la data, frecce, "Oggi", calendarino
 * per saltare a una data qualsiasi, e una striscia di giorni con il numero di
 * appuntamenti di ciascuno. Le frecce ← → della tastiera cambiano giorno.
 */
export function DayNavigator({
  current,
  counts,
  onChange,
}: {
  current: Date;
  /** Appuntamenti per giorno ("yyyy-MM-dd" → numero) intorno a quello scelto. */
  counts: Map<string, number>;
  onChange: (day: Date) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const days = Array.from({ length: SPAN * 2 + 1 }, (_, i) => addDays(current, i - SPAN));

  // Tiene il giorno scelto al centro della striscia.
  useEffect(() => {
    const strip = stripRef.current;
    const selected = strip?.querySelector<HTMLElement>("[aria-current=date]");
    if (strip && selected) {
      strip.scrollTo({
        left: selected.offsetLeft - strip.clientWidth / 2 + selected.clientWidth / 2,
        behavior: "smooth",
      });
    }
  }, [current]);

  // Frecce della tastiera, se non si sta scrivendo in un campo o lavorando in un popup.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog], .rbc-calendar")) return;
      event.preventDefault();
      onChange(addDays(current, event.key === "ArrowLeft" ? -1 : 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onChange]);

  const relative = relativeLabel(current, today);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t.agenda.back} onClick={() => onChange(addDays(current, -1))}>
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t.agenda.forward}
          onClick={() => onChange(addDays(current, 1))}
        >
          <ChevronRightIcon />
        </Button>
        <motion.div
          key={format(current, "yyyy-MM-dd")}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="px-1"
        >
          <h1 className="text-lg leading-tight font-semibold first-letter:uppercase">
            {format(current, "EEEE d MMMM yyyy", { locale: it })}
          </h1>
          {relative ? <p className="text-xs text-muted-foreground">{relative}</p> : null}
        </motion.div>
        <div className="flex items-center gap-2">
          {isSameDay(current, today) ? null : (
            <Button variant="outline" size="sm" onClick={() => onChange(today)}>
              {t.agenda.today}
            </Button>
          )}
          <span className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const picker = pickerRef.current;
                if (!picker) return;
                // showPicker apre il calendario del browser; dove manca, il campo prende il fuoco.
                if (typeof picker.showPicker === "function") picker.showPicker();
                else picker.focus();
              }}
            >
              <CalendarSearchIcon /> {t.agenda.pickDate}
            </Button>
            <input
              ref={pickerRef}
              type="date"
              tabIndex={-1}
              aria-label={t.agenda.pickDate}
              className="pointer-events-none absolute inset-0 opacity-0"
              value={format(current, "yyyy-MM-dd")}
              onChange={(event) => {
                if (!event.target.value) return;
                const [year, month, day] = event.target.value.split("-").map(Number);
                onChange(new Date(year, month - 1, day));
              }}
            />
          </span>
        </div>
      </div>

      <div
        ref={stripRef}
        role="toolbar"
        aria-label={t.agenda.dayStrip}
        className="flex snap-x gap-1.5 overflow-x-auto scroll-smooth px-6 pb-1 [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] [scrollbar-width:none]"
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const selected = isSameDay(day, current);
          const isToday = isSameDay(day, today);
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          const count = counts.get(key) ?? 0;
          return (
            <button
              key={key}
              type="button"
              aria-current={selected ? "date" : undefined}
              aria-label={`${format(day, "EEEE d MMMM", { locale: it })}: ${t.agenda.countLabel(count)}`}
              onClick={() => onChange(day)}
              className={cn(
                "relative flex w-14 shrink-0 snap-center flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "text-primary-foreground" : "hover:bg-muted",
                !selected && weekend && "text-muted-foreground",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="day-strip-selection"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                />
              ) : null}
              <span className="relative text-[11px] font-medium uppercase">{format(day, "EEE", { locale: it })}</span>
              <span
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full text-base font-semibold tabular-nums",
                  isToday && !selected && "ring-2 ring-primary",
                )}
              >
                {format(day, "d")}
              </span>
              {/* Pallini: uno ogni 2 appuntamenti, al massimo 4; il numero esatto è nell'etichetta. */}
              <span className="relative flex h-1.5 items-center gap-0.5" aria-hidden>
                {Array.from({ length: Math.min(4, Math.ceil(count / 2)) }, (_, i) => (
                  <span
                    key={i}
                    className={cn("size-1 rounded-full", selected ? "bg-primary-foreground" : "bg-primary/70")}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
