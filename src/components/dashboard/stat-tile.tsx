"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CountUp } from "./count-up";

export function StatTile({
  label,
  value,
  suffix,
  hint,
  icon,
  index,
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: ReactNode;
  icon: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</span>
      </div>
      <span className="text-3xl font-semibold tracking-tight">
        <CountUp value={value} suffix={suffix} />
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </motion.div>
  );
}
