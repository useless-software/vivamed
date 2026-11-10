// Scarica l'elenco ufficiale dei comuni italiani da ISTAT e lo salva in
// src/data/comuni.json, usato per calcolare il codice fiscale.
//
//   node scripts/update-comuni.mjs
//
// Dati: ISTAT, "Codici statistici delle unità amministrative territoriali",
// licenza Creative Commons Attribuzione 4.0 (CC BY 4.0).
import { writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE = "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.csv";
const target = path.resolve(import.meta.dirname, "..", "src", "data", "comuni.json");

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Download non riuscito: HTTP ${response.status}`);
// Il file è in codifica Windows-1252.
const text = new TextDecoder("windows-1252").decode(await response.arrayBuffer());

/** Parser CSV minimale con separatore ";" e campi tra virgolette (anche su più righe). */
function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) rows.push([...row, field]);
  return rows;
}

const [header, ...rows] = parseCsv(text);
const column = (prefix) => {
  const index = header.findIndex((name) => name.trim().startsWith(prefix));
  if (index === -1) throw new Error(`Colonna "${prefix}" non trovata: il formato ISTAT è cambiato?`);
  return index;
};
const nameColumn = column("Denominazione in italiano");
const provinceColumn = column("Sigla automobilistica");
const codeColumn = column("Codice Catastale");

const comuni = rows
  .filter((row) => row.length > codeColumn && /^[A-Z]\d{3}$/.test(row[codeColumn].trim()))
  .map((row) => [row[nameColumn].trim(), row[provinceColumn].trim(), row[codeColumn].trim()])
  .sort((a, b) => a[0].localeCompare(b[0], "it"));

if (comuni.length < 7000) throw new Error(`Trovati solo ${comuni.length} comuni: il file sembra incompleto.`);

const payload = {
  source: "ISTAT - Elenco comuni italiani (CC BY 4.0)",
  updatedAt: new Date().toISOString().slice(0, 10),
  // [denominazione, sigla provincia, codice catastale]
  comuni,
};
writeFileSync(target, JSON.stringify(payload) + "\n");
console.log(`Salvati ${comuni.length} comuni in ${path.relative(process.cwd(), target)}`);
