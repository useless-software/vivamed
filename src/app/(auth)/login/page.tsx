import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t.auth.loginTitle };

// Sessione e database si leggono a ogni richiesta: il contenuto arriva in
// streaming dentro <Suspense>, come richiesto dai Cache Components di Next.js.
export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  if (await getCurrentUser()) redirect("/agenda");
  // Primo avvio: nessun utente, si parte dalla configurazione guidata.
  if ((await db.user.count()) === 0) redirect("/setup");
  return <LoginForm />;
}
