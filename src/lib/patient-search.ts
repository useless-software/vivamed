import type { Prisma } from "@/generated/prisma/client";

/**
 * Filtro di ricerca pazienti: ogni parola deve comparire in almeno uno tra
 * nome, cognome, codice fiscale e telefono ("rossi mario" e "mario rossi"
 * trovano lo stesso paziente).
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
      ],
    })),
  };
}
