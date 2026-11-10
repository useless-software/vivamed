import type { Prisma } from "@/generated/prisma/client";

/**
 * Filtro di ricerca pazienti: ogni parola deve comparire in almeno uno tra
 * nome, cognome, codice fiscale, telefono, email e luogo di nascita
 * ("rossi mario" e "mario rossi" trovano lo stesso paziente).
 */
export function patientSearchWhere(query: string): Prisma.PatientWhereInput {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    AND: words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
        { fiscalCode: { contains: word, mode: "insensitive" as const } },
        { phone: { contains: word } },
        { email: { contains: word, mode: "insensitive" as const } },
        { birthPlace: { contains: word, mode: "insensitive" as const } },
      ],
    })),
  };
}

export const PATIENT_SORTS = ["cognome", "cognome-desc", "recenti", "meno-recenti"] as const;
export type PatientSort = (typeof PATIENT_SORTS)[number];

export function parsePatientSort(value: unknown): PatientSort {
  return PATIENT_SORTS.includes(value as PatientSort) ? (value as PatientSort) : "cognome";
}

export function patientOrderBy(sort: PatientSort): Prisma.PatientOrderByWithRelationInput[] {
  switch (sort) {
    case "cognome-desc":
      return [{ lastName: "desc" }, { firstName: "desc" }, { id: "desc" }];
    case "recenti":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "meno-recenti":
      return [{ createdAt: "asc" }, { id: "asc" }];
    default:
      return [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }];
  }
}
