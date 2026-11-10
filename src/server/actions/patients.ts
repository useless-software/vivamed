"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { patientSearchWhere } from "@/lib/patient-search";
import { invalid, patientSchema, type ActionState } from "@/lib/validation";
import { isUniqueViolation } from "@/lib/db-errors";
import { authorize, formToObject } from "./helpers";

/** Crea un paziente, o lo aggiorna se il form contiene `id`. */
export async function savePatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("patients.write");
  if (auth.denied) return auth.denied;

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  let createdId: string | null = null;
  try {
    if (id) {
      await db.patient.update({ where: { id }, data: parsed.data });
    } else {
      createdId = (await db.patient.create({ data: parsed.data })).id;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: t.errors.fiscalCodeTaken, fieldErrors: { fiscalCode: [t.errors.fiscalCodeTaken] } };
    }
    throw error;
  }

  if (createdId) redirect(`/pazienti/${createdId}`);
  refresh();
  return { ok: true };
}

export type PatientOption = { id: string; label: string; detail: string | null };

/** Ricerca veloce usata dal selettore paziente nel form appuntamento. */
export async function searchPatients(query: string): Promise<PatientOption[]> {
  const auth = await authorize("patients.read");
  if (auth.denied) return [];

  const patients = await db.patient.findMany({
    where: patientSearchWhere(String(query).slice(0, 100)),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 8,
    select: { id: true, firstName: true, lastName: true, fiscalCode: true, phone: true },
  });
  return patients.map((p) => ({
    id: p.id,
    label: `${p.lastName} ${p.firstName}`,
    detail: p.fiscalCode ?? p.phone,
  }));
}
