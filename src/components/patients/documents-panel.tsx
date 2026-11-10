"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, FileIcon, FileImageIcon, FileTextIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/lib/client/celebrate";
import { ACCEPT_ATTRIBUTE, formatSize } from "@/lib/documents";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { deleteDocument } from "@/server/actions/patients";

export type DocumentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string | null;
};

function DocumentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImageIcon className="size-5 text-sky-600" />;
  if (mimeType === "application/pdf") return <FileTextIcon className="size-5 text-red-600" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}

export function DocumentsPanel({
  patientId,
  documents,
  canWrite,
  maxSizeLabel,
}: {
  patientId: string;
  documents: DocumentRow[];
  canWrite: boolean;
  maxSizeLabel: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deleting, startDeleting] = useTransition();

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;
    const body = new FormData();
    for (const file of list) body.append("files", file);
    setUploading(true);
    try {
      const response = await fetch(`/api/pazienti/${patientId}/documenti`, { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!response.ok) {
        toast.error(result.error ?? t.errors.generic);
        return;
      }
      toast.success(t.documents.uploaded(result.count ?? list.length));
      celebrate();
      router.refresh();
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(document: DocumentRow) {
    if (!window.confirm(t.documents.deleteConfirm(document.fileName))) return;
    startDeleting(async () => {
      const result = await deleteDocument(document.id);
      if (result.error) toast.error(result.error);
      else toast.success(t.documents.deleted);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canWrite ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border-2 border-dashed p-4 text-center text-sm transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <UploadIcon className={cn("size-6 text-muted-foreground", uploading && "animate-bounce text-primary")} />
          {uploading ? (
            <span>{t.documents.uploading}</span>
          ) : (
            <span>
              {t.documents.dropHint}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                {t.documents.choose}
              </button>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{t.documents.allowed(maxSizeLabel)}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            aria-label={t.documents.upload}
            onChange={(event) => event.target.files && void upload(event.target.files)}
          />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.documents.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
              <DocumentIcon mimeType={document.mimeType} />
              <a
                href={`/api/documenti/${document.id}`}
                target="_blank"
                rel="noopener"
                className="min-w-0 flex-1 hover:underline"
                title={t.documents.open}
              >
                <span className="block truncate font-medium">{document.fileName}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatSize(document.size)} · {document.uploadedAt}
                  {document.uploadedBy ? ` · ${document.uploadedBy}` : ""}
                </span>
              </a>
              <a
                href={`/api/documenti/${document.id}?scarica`}
                className={cn("rounded-md p-1.5 hover:bg-muted")}
                title={t.documents.download}
                aria-label={`${t.documents.download} ${document.fileName}`}
              >
                <DownloadIcon className="size-4" />
              </a>
              {canWrite ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={deleting}
                  onClick={() => remove(document)}
                  aria-label={`${t.documents.delete} ${document.fileName}`}
                  title={t.documents.delete}
                >
                  <Trash2Icon className="text-destructive" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
