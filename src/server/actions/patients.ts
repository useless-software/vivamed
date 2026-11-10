"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { t } from "@/lib/messages";
import { patientSearchWhere } from "@/lib/patient-search";
import { searchPlaces, type Place } from "@/lib/places";
import { deleteFiles } from "@/lib/storage";
import { invalid, patientSchema, type ActionState } from "@/lib/validation";
import { authorize, formToObject } from "./helpers";

/**
 * Crea un paziente, o lo aggiorna se il form contiene `id`.
 * Con `inline=1` (nuovo paziente dal form appuntamento) non cambia pagina:
 * restituisce il paziente creato, che viene subito selezionato.
 */
export async function savePatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await authorize("patients.write");
  if (auth.denied) return auth.denied;

  const raw = formToObject(formData);
  const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : null;
  const inline = raw.inline === "1";
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  let created: { id: string; label: string } | undefined;
  try {
    if (id) {
      await db.patient.update({ where: { id }, data });
    } else {
      const patient = await db.patient.create({ data });
      created = { id: patient.id, label: `${patient.lastName} ${patient.firstName}` };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: t.errors.fiscalCodeTaken, fieldErrors: { fiscalCode: [t.errors.fiscalCodeTaken] } };
    }
    throw error;
  }

  if (created && !inline) redirect(`/pazienti/${created.id}`);
  if (!inline) refresh();
  return { ok: true, created };
}

/** Elimina il paziente con tutti i suoi appuntamenti e documenti (anche i file su disco). */
export async function deletePatient(id: string): Promise<ActionState> {
  const auth = await authorize("patients.delete");
  if (auth.denied) return auth.denied;

  const keys = await db.$transaction(async (tx) => {
    const patient = await tx.patient.findUnique({
      where: { id: String(id) },
      select: { id: true, documents: { select: { storageKey: true } } },
    });
    if (!patient) return null;
    await tx.appointment.deleteMany({ where: { patientId: patient.id } });
    // I documenti si cancellano a cascata insieme al paziente.
    await tx.patient.delete({ where: { id: patient.id } });
    return patient.documents.map((document) => document.storageKey);
  });
  if (!keys) return { error: t.errors.notFound };

  // I file si tolgono solo dopo che il database ha confermato la cancellazione.
  await deleteFiles(keys);
  redirect("/pazienti");
}

export async function deleteDocument(id: string): Promise<ActionState> {
  const auth = await authorize("patients.write");
  if (auth.denied) return auth.denied;

  const document = await db.patientDocument.findUnique({ where: { id: String(id) } });
  if (!document) return { error: t.errors.notFound };
  await db.patientDocument.delete({ where: { id: document.id } });
  await deleteFiles([document.storageKey]);
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
    select: { id: true, firstName: true, lastName: true, fiscalCode: true, phone: true, birthDate: true },
  });
  return patients.map((p) => ({
    id: p.id,
    label: `${p.lastName} ${p.firstName}`,
    detail: p.fiscalCode ?? p.phone,
  }));
}

/** Ricerca del comune di nascita per il codice fiscale. */
export async function searchBirthPlaces(query: string): Promise<Place[]> {
  const auth = await authorize("patients.read");
  if (auth.denied) return [];
  return searchPlaces(String(query).slice(0, 60));
}
