import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOCUMENT_TYPES, extensionOf, formatSize, isAllowedDocument } from "@/lib/documents";
import { t } from "@/lib/messages";
import { can } from "@/lib/permissions";
import { deleteFiles, MAX_UPLOAD_BYTES, saveFile } from "@/lib/storage";

// Caricamento dei documenti di un paziente (uno o più file nel campo "files").
// È un Route Handler e non una Server Action perché queste accettano al massimo
// 1 MB; il limite qui è MAX_UPLOAD_MB (predefinito 20 MB) per ogni file.
export async function POST(request: Request, { params }: RouteContext<"/api/pazienti/[id]/documenti">) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "patients.write")) {
    return Response.json({ error: t.errors.forbidden }, { status: 403 });
  }

  const { id } = await params;
  const patient = await db.patient.findUnique({ where: { id }, select: { id: true } });
  if (!patient) return Response.json({ error: t.errors.notFound }, { status: 404 });

  // Rifiuta subito le richieste chiaramente troppo grandi, prima di leggerle.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES * 10) {
    return Response.json({ error: t.documents.tooLarge(formatSize(MAX_UPLOAD_BYTES)) }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: t.errors.generic }, { status: 400 });
  }
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return Response.json({ error: t.documents.noFile }, { status: 400 });
  if (files.length > 10) return Response.json({ error: t.documents.tooMany }, { status: 400 });

  for (const file of files) {
    if (!isAllowedDocument(file.name)) {
      return Response.json({ error: t.documents.badType(file.name) }, { status: 415 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: t.documents.tooLarge(formatSize(MAX_UPLOAD_BYTES)) }, { status: 413 });
    }
  }

  const saved: string[] = [];
  try {
    for (const file of files) {
      const extension = extensionOf(file.name);
      const key = await saveFile(patient.id, extension, new Uint8Array(await file.arrayBuffer()));
      saved.push(key);
      await db.patientDocument.create({
        data: {
          patientId: patient.id,
          fileName: file.name.slice(0, 200),
          mimeType: DOCUMENT_TYPES[extension],
          size: file.size,
          storageKey: key,
          uploadedById: user.id,
        },
      });
    }
  } catch (error) {
    // Niente file "orfani": se qualcosa va storto, eliminiamo quelli di questa richiesta.
    await db.patientDocument.deleteMany({ where: { storageKey: { in: saved } } });
    await deleteFiles(saved);
    throw error;
  }

  return Response.json({ ok: true, count: files.length });
}
