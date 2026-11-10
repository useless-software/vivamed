import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="text-lg font-medium">Pagina non trovata</h1>
      <p className="text-sm text-muted-foreground">
        La pagina non esiste oppure non hai i permessi per vederla.
      </p>
      <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Torna alla home
      </Link>
    </main>
  );
}
