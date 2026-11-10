import "server-only";
import data from "@/data/comuni.json";

// Ricerca dei luoghi di nascita (comuni italiani, dati ISTAT) per il codice fiscale.

export type Place = { label: string; code: string };

type Entry = { label: string; code: string; key: string };

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let index: Entry[] | undefined;

function entries(): Entry[] {
  index ??= (data.comuni as [string, string, string][]).map(([name, province, code]) => ({
    label: `${name} (${province})`,
    code,
    key: normalize(name),
  }));
  return index;
}

/** Prima i comuni che iniziano con il testo cercato, poi quelli che lo contengono. */
export function searchPlaces(query: string, limit = 8): Place[] {
  const text = normalize(query);
  if (text.length < 2) return [];
  const all = entries();
  const starts = all.filter((entry) => entry.key.startsWith(text));
  const contains = all.filter((entry) => !entry.key.startsWith(text) && entry.key.includes(text));
  return [...starts, ...contains].slice(0, limit).map(({ label, code }) => ({ label, code }));
}

export function placeByCode(code: string): Place | null {
  const entry = entries().find((item) => item.code === code.toUpperCase());
  return entry ? { label: entry.label, code: entry.code } : null;
}
