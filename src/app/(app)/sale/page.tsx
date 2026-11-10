import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageLoading } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/messages";
import { RoomDialog } from "./room-dialog";

export const metadata: Metadata = { title: t.rooms.title };

export default function RoomsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RoomsContent />
    </Suspense>
  );
}

async function RoomsContent() {
  await requirePermission("rooms.manage");
  const rooms = await db.room.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, color: true, active: true },
  });

  return (
    <>
      <PageHeader title={t.rooms.title} subtitle={t.rooms.subtitle}>
        <RoomDialog />
      </PageHeader>
      {rooms.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t.rooms.empty}
        </p>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.rooms.name}</TableHead>
                <TableHead>{t.users.state}</TableHead>
                <TableHead className="w-0 text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id} className={room.active ? undefined : "text-muted-foreground"}>
                  <TableCell className="font-medium">
                    <span
                      className="mr-2 inline-block size-3 rounded-full align-middle"
                      style={{ backgroundColor: room.color }}
                    />
                    {room.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={room.active ? "secondary" : "outline"}>
                      {room.active ? t.common.activeF : t.common.inactiveF}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RoomDialog room={room} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
