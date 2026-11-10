import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { requirePermission } from "@/lib/auth";
import { t } from "@/lib/messages";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: t.settings.title };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  await requirePermission("settings.manage");
  const settings = await getSettings();
  return (
    <>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <SettingsForm settings={settings} />
    </>
  );
}
