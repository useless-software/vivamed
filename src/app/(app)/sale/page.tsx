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
  const [rooms, doctors] = await Promise.all([
    db.room.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        active: true,
        doctors: { orderBy: { name: "asc" }, select: { id: true, name: true, title: true } },
      },
    }),
    db.user.findMany({
      where: { role: "DOCTOR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, title: true, active: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={t.rooms.title} subtitle={t.rooms.subtitle}>
        <RoomDialog doctors={doctors} />
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
                <TableHead>{t.rooms.doctors}</TableHead>
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
                  <TableCell className="whitespace-normal">
                    {room.doctors.length === 0 ? (
                      <span className="text-muted-foreground">{t.rooms.anyDoctor}</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {room.doctors.map((doctor) => (
                          <Badge key={doctor.id} variant="outline">
                            {doctorLabel(doctor.title, doctor.name)}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={room.active ? "secondary" : "outline"}>
                      {room.active ? t.common.activeF : t.common.inactiveF}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RoomDialog room={room} doctors={doctors} />
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
