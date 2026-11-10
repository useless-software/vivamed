import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarPlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatAppointmentRange, toDateInputValue } from "@/lib/format";
import { t } from "@/lib/messages";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: t.patients.title };

export default function PatientPage({ params }: PageProps<"/pazienti/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PatientContent params={params} />
    </Suspense>
  );
}

async function PatientContent({ params }: Pick<PageProps<"/pazienti/[id]">, "params">) {
  await requirePermission("patients.read");
  const { id } = await params;

  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 50,
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          reason: true,
          doctor: { select: { name: true } },
          room: { select: { name: true } },
        },
      },
    },
  });
  if (!patient) notFound();

  return (
    <>
      <PageHeader title={`${patient.lastName} ${patient.firstName}`} subtitle={patient.fiscalCode ?? undefined}>
        <Link href={`/agenda?paziente=${patient.id}`} className={buttonVariants()}>
          <CalendarPlusIcon /> {t.patients.book}
        </Link>
      </PageHeader>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t.patients.data}</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientForm
              patient={{
                id: patient.id,
                firstName: patient.firstName,
                lastName: patient.lastName,
                fiscalCode: patient.fiscalCode ?? "",
                birthDate: toDateInputValue(patient.birthDate),
                phone: patient.phone ?? "",
                email: patient.email ?? "",
                address: patient.address ?? "",
                notes: patient.notes ?? "",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.patients.appointments}</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.patients.noAppointments}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {patient.appointments.map((appointment) => (
                  <li key={appointment.id} className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0">
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {formatAppointmentRange(appointment.startsAt, appointment.endsAt)}
                      <StatusBadge status={appointment.status} />
                    </span>
                    <span className="text-muted-foreground">
                      {appointment.doctor.name} · {appointment.room.name}
                    </span>
                    {appointment.reason ? <span>{appointment.reason}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
