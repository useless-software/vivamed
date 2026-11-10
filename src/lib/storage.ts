import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// I documenti dei pazienti stanno su disco, in UPLOAD_DIR (in Docker è un volume).
// Nel database si salva solo la "chiave", cioè il percorso relativo.

const root = path.resolve(process.env.UPLOAD_DIR || "uploads");

export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 20) * 1024 * 1024;

/** Percorso assoluto di una chiave, impedendo di uscire dalla cartella (es. "../"). */
function resolveKey(key: string): string {
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Percorso del documento non valido");
  return full;
}

export async function saveFile(folder: string, extension: string, data: Uint8Array): Promise<string> {
  // Nome casuale: il nome originale (che può contenere dati personali) resta solo nel database.
  const key = `${folder.replace(/[^a-zA-Z0-9_-]/g, "")}/${randomUUID()}.${extension.replace(/[^a-z0-9]/g, "")}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx" });
  return key;
}

export function readStoredFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** Elimina i file indicati; quelli già mancanti vengono ignorati. */
export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => rm(resolveKey(key), { force: true })));
}
