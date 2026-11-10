import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { doctorLabel } from "@/lib/doctors";
import { t } from "@/lib/messages";
import { UserDialog } from "./user-dialog";

export const metadata: Metadata = { title: t.users.title };

export default function UsersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UsersContent />
    </Suspense>
  );
}

async function UsersContent() {
  const current = await requirePermission("users.manage");
  const rows = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, title: true, active: true, passwordHash: true },
  });

  // L'hash della password non deve mai arrivare al browser: basta sapere se c'è.
  const users = rows.map(({ passwordHash, ...user }) => ({ ...user, hasPassword: passwordHash !== null }));

  return (
    <>
      <PageHeader title={t.users.title} subtitle={t.users.subtitle}>
        <UserDialog />
      </PageHeader>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.auth.name}</TableHead>
              <TableHead>{t.auth.email}</TableHead>
              <TableHead>{t.users.role}</TableHead>
              <TableHead>{t.users.state}</TableHead>
              <TableHead className="w-0 text-right">{t.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={user.active ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">
                  {doctorLabel(user.title, user.name)}
                  {user.id === current.id ? (
                    <span className="ml-1 font-normal text-muted-foreground">({t.users.you})</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {user.email ?? <span className="text-muted-foreground italic">{t.users.noAccess}</span>}
                </TableCell>
                <TableCell>{t.roles[user.role]}</TableCell>
                <TableCell>
                  <Badge variant={user.active ? "secondary" : "outline"}>
                    {user.active ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserDialog user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
