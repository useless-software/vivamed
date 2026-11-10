import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/messages";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: t.profile.title };

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{user.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{user.email}</p>
            <p>{t.roles[user.role]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.profile.changePassword}</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
