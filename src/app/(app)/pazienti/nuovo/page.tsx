import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { t } from "@/lib/messages";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: t.patients.new };

export default function NewPatientPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewPatientContent />
    </Suspense>
  );
}

async function NewPatientContent() {
  await requirePermission("patients.write");
  return (
    <>
      <PageHeader title={t.patients.new} />
      <Card className="max-w-3xl">
        <CardContent>
          <PatientForm />
        </CardContent>
      </Card>
    </>
  );
}
