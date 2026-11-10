// Aspetto degli stati degli appuntamenti, condiviso da componenti server e client.
import { CheckIcon, Clock3Icon, XIcon, type LucideIcon } from "lucide-react";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export const STATUS_ORDER: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];

/** Aspetto di ogni stato: orologio grigio, spunta verde scuro, X rosso scuro. */
export const STATUS_STYLE: Record<AppointmentStatus, { icon: LucideIcon; text: string; bg: string; solid: string }> = {
  PENDING: { icon: Clock3Icon, text: "text-zinc-500", bg: "bg-zinc-100", solid: "bg-zinc-500" },
  CONFIRMED: { icon: CheckIcon, text: "text-green-800", bg: "bg-green-100", solid: "bg-green-800" },
  CANCELLED: { icon: XIcon, text: "text-red-800", bg: "bg-red-100", solid: "bg-red-800" },
};

export function StatusIcon({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { icon: Icon, text } = STATUS_STYLE[status];
  return <Icon aria-label={t.status[status]} className={cn("size-4 shrink-0", text, className)} strokeWidth={2.5} />;
}
