import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { INLINE_TYPES } from "@/lib/documents";
import { t } from "@/lib/messages";
import { can } from "@/lib/permissions";
import { readStoredFile } from "@/lib/storage";

/** Scarica (o mostra, per PDF e immagini) un documento del paziente. */
export async function GET(request: Request, { params }: RouteContext<"/api/documenti/[id]">) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "patients.read")) {
    return new Response(t.errors.forbidden, { status: 403 });
  }

  const { id } = await params;
  const document = await db.patientDocument.findUnique({ where: { id } });
  if (!document) return new Response(t.errors.notFound, { status: 404 });

  let data: Buffer;
  try {
    data = await readStoredFile(document.storageKey);
  } catch {
    return new Response(t.documents.missingFile, { status: 404 });
  }

  const download = new URL(request.url).searchParams.has("scarica");
  const disposition = !download && INLINE_TYPES.has(document.mimeType) ? "inline" : "attachment";
  // Nome del file in UTF-8 (RFC 5987), con una versione ASCII di riserva.
  const ascii = document.fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      // Dati sanitari: niente cache condivise, e nessuna interpretazione "creativa" del tipo.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
