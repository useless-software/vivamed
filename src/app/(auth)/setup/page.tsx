import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: t.auth.setupTitle };

export default function SetupPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SetupContent />
    </Suspense>
  );
}

async function SetupContent() {
  await connection();
  // La configurazione iniziale esiste solo finché il database è vuoto.
  if ((await db.user.count()) > 0) redirect("/login");
  return <SetupForm />;
}
