"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Numero che "sale" fino al valore finale quando compare. */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = `${value.toLocaleString("it-IT")}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = `${Math.round(latest).toLocaleString("it-IT")}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, suffix, reduce]);

  // Il valore finale è già nell'HTML: senza JavaScript (o per i lettori di schermo) è corretto.
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString("it-IT")}
      {suffix}
    </span>
  );
}
