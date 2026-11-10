// Calcolo e verifica del codice fiscale delle persone fisiche (DM 23/12/1976).
// Modulo puro, usato sia nel browser (pulsante "Calcola") sia sul server (verifica).
//
// Limiti: l'omocodia (codici modificati dall'Agenzia delle Entrate quando due
// persone avrebbero lo stesso codice) non si può calcolare, ma i codici omocodici
// vengono comunque riconosciuti come validi.

const MONTHS = "ABCDEHLMPRST";
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** Lettere maiuscole senza accenti, spazi o apostrofi: "D'Amico Nicolò" → "DAMICONICOLO". */
function letters(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function split(value: string) {
  const chars = [...letters(value)];
  return {
    consonants: chars.filter((c) => !VOWELS.has(c)),
    vowels: chars.filter((c) => VOWELS.has(c)),
  };
}

function pad(chars: string[]): string {
  return (chars.join("") + "XXX").slice(0, 3);
}

export function surnameCode(surname: string): string {
  const { consonants, vowels } = split(surname);
  return pad([...consonants, ...vowels]);
}

export function nameCode(name: string): string {
  const { consonants, vowels } = split(name);
  // Con 4 o più consonanti si saltano la seconda: prima, terza e quarta.
  if (consonants.length >= 4) return consonants[0] + consonants[2] + consonants[3];
  return pad([...consonants, ...vowels]);
}

const ODD: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

function evenValue(char: string): number {
  return /\d/.test(char) ? Number(char) : char.charCodeAt(0) - 65;
}

/** Carattere di controllo calcolato sui primi 15 caratteri. */
export function checkCharacter(first15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = first15[i];
    // Le posizioni si contano da 1: la prima è dispari.
    sum += i % 2 === 0 ? ODD[char] : evenValue(char);
  }
  return String.fromCharCode(65 + (sum % 26));
}

export type FiscalCodeInput = {
  firstName: string;
  lastName: string;
  sex: "M" | "F";
  /** Data di nascita (si usano anno, mese e giorno in UTC). */
  birthDate: Date;
  /** Codice catastale del comune o dello stato estero, es. "H501" o "Z404". */
  birthPlaceCode: string;
};

export function computeFiscalCode(input: FiscalCodeInput): string {
  const place = input.birthPlaceCode.trim().toUpperCase();
  if (!/^[A-Z]\d{3}$/.test(place)) throw new Error("Codice del luogo di nascita non valido");
  const year = String(input.birthDate.getUTCFullYear() % 100).padStart(2, "0");
  const month = MONTHS[input.birthDate.getUTCMonth()];
  const day = String(input.birthDate.getUTCDate() + (input.sex === "F" ? 40 : 0)).padStart(2, "0");
  const first15 = surnameCode(input.lastName) + nameCode(input.firstName) + year + month + day + place;
  return first15 + checkCharacter(first15);
}

// Nelle posizioni numeriche l'omocodia sostituisce le cifre con queste lettere.
const OMO = "[0-9LMNPQRSTUV]";
const FORMAT = new RegExp(`^[A-Z]{6}${OMO}{2}[ABCDEHLMPRST]${OMO}{2}[A-Z]${OMO}{3}[A-Z]$`);

/** Formato corretto e carattere di controllo coerente (omocodie comprese). */
export function isValidFiscalCode(value: string): boolean {
  const code = value.trim().toUpperCase();
  return FORMAT.test(code) && checkCharacter(code.slice(0, 15)) === code[15];
}
