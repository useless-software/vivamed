// Regole sui documenti dei pazienti. Modulo puro (usato anche nel browser).

/** Estensioni accettate, con il tipo MIME con cui il file viene restituito. */
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
  dcm: "application/dicom",
  zip: "application/zip",
};

/** Tipi che il browser può mostrare in sicurezza in una scheda invece di scaricarli. */
export const INLINE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"]);

export const ACCEPT_ATTRIBUTE = Object.keys(DOCUMENT_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

export function isAllowedDocument(fileName: string): boolean {
  return extensionOf(fileName) in DOCUMENT_TYPES;
}

/** "1,2 MB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`;
}
