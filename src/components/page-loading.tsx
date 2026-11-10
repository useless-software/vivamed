import { t } from "@/lib/messages";

/** Segnaposto mostrato mentre il contenuto della pagina arriva in streaming. */
export function PageLoading() {
  return <p className="p-2 text-center text-sm text-muted-foreground">{t.app.loading}</p>;
}
