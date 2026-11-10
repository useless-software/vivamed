"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <PrinterIcon /> {t.print.print}
    </Button>
  );
}
