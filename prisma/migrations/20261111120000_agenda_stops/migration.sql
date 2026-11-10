-- "Stop" in agenda: blocchi con solo un commento (pausa, sala chiusa…) legati a
-- una sala e a uno o più medici.


-- CreateTable
CREATE TABLE "AgendaStop" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AgendaStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StopDoctors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StopDoctors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "AgendaStop_roomId_startsAt_idx" ON "AgendaStop"("roomId", "startsAt");

-- CreateIndex
CREATE INDEX "AgendaStop_startsAt_idx" ON "AgendaStop"("startsAt");

-- CreateIndex
CREATE INDEX "_StopDoctors_B_index" ON "_StopDoctors"("B");

-- AddForeignKey
ALTER TABLE "AgendaStop" ADD CONSTRAINT "AgendaStop_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaStop" ADD CONSTRAINT "AgendaStop_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StopDoctors" ADD CONSTRAINT "_StopDoctors_A_fkey" FOREIGN KEY ("A") REFERENCES "AgendaStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StopDoctors" ADD CONSTRAINT "_StopDoctors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "AgendaStop" ADD CONSTRAINT "AgendaStop_time_order_check" CHECK ("endsAt" > "startsAt");
