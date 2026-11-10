// Come scrivere il nome di un medico. Modulo puro.

export type DoctorTitle = "NONE" | "DOTT" | "DOTT_SSA" | "PROF" | "PROF_SSA";

const TITLES: Record<DoctorTitle, { short: string; article: string }> = {
  NONE: { short: "", article: "" },
  DOTT: { short: "Dott.", article: "il" },
  DOTT_SSA: { short: "Dott.ssa", article: "la" },
  PROF: { short: "Prof.", article: "il" },
  PROF_SSA: { short: "Prof.ssa", article: "la" },
};

/** "Dott.ssa Elena Verdi" (o solo il nome se non ha titolo). */
export function doctorLabel(title: DoctorTitle, name: string): string {
  const { short } = TITLES[title];
  return short ? `${short} ${name}` : name;
}

/** Per l'interno di una frase: "il dott. Marco Rossi", "la dott.ssa Elena Verdi". */
export function doctorInSentence(title: DoctorTitle, name: string): string {
  const { short, article } = TITLES[title];
  return short ? `${article} ${short.toLowerCase()} ${name}` : name;
}
