import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/messages";

type Status = keyof typeof t.status;

const variants: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "outline",
  NO_SHOW: "destructive",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={variants[status]}>{t.status[status]}</Badge>;
}
