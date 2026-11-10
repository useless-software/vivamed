import { STATUS_STYLE, type AppointmentStatus } from "@/components/status-style";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { icon: Icon, text, bg } = STATUS_STYLE[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", bg, text)}>
      <Icon className="size-3.5" strokeWidth={2.5} />
      {t.status[status]}
    </span>
  );
}
