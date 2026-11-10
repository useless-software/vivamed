-- Seconda iterazione di vivamed:
-- * medici senza email (e quindi senza accesso) e titolo del medico
-- * medici assegnati alle sale
-- * sesso e luogo di nascita del paziente (per il codice fiscale)
-- * conferma dell'appuntamento (in sospeso / confermato / disdetto),
--   esito della visita e promemoria inviato
-- * impostazioni dello studio

CREATE TYPE "DoctorTitle" AS ENUM ('NONE', 'DOTT', 'DOTT_SSA', 'PROF', 'PROF_SSA');
CREATE TYPE "Sex" AS ENUM ('M', 'F');
CREATE TYPE "AppointmentOutcome" AS ENUM ('COMPLETED', 'NO_SHOW');

-- Utenti ----------------------------------------------------------------------
ALTER TABLE "User"
  ADD COLUMN "title" "DoctorTitle" NOT NULL DEFAULT 'NONE',
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Pazienti --------------------------------------------------------------------
ALTER TABLE "Patient"
  ADD COLUMN "sex" "Sex",
  ADD COLUMN "birthPlace" TEXT,
  ADD COLUMN "birthPlaceCode" TEXT;

-- Appuntamenti ----------------------------------------------------------------
ALTER TABLE "Appointment"
  ADD COLUMN "outcome" "AppointmentOutcome",
  ADD COLUMN "reminderSentAt" TIMESTAMPTZ(3);

-- L'esito della visita prima stava dentro lo stato: lo spostiamo nel nuovo campo.
UPDATE "Appointment" SET "outcome" = 'COMPLETED' WHERE "status" = 'COMPLETED';
UPDATE "Appointment" SET "outcome" = 'NO_SHOW' WHERE "status" = 'NO_SHOW';

-- I vincoli anti-sovrapposizione dipendono dal tipo dello stato: li togliamo
-- durante la conversione e li ricreiamo identici subito dopo.
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_room_no_overlap";
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_doctor_no_overlap";

CREATE TYPE "AppointmentStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus_new" USING (
  CASE "status"::text
    WHEN 'COMPLETED' THEN 'CONFIRMED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    ELSE 'PENDING'
  END
)::"AppointmentStatus_new";
DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_room_no_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_doctor_no_overlap"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

-- Indice per la sezione Promemoria (appuntamenti futuri e promemoria inviati).
CREATE INDEX "Appointment_reminderSentAt_idx" ON "Appointment"("reminderSentAt");

-- Medici assegnati alle sale --------------------------------------------------
CREATE TABLE "_RoomDoctors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoomDoctors_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_RoomDoctors_B_index" ON "_RoomDoctors"("B");
ALTER TABLE "_RoomDoctors" ADD CONSTRAINT "_RoomDoctors_A_fkey" FOREIGN KEY ("A") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RoomDoctors" ADD CONSTRAINT "_RoomDoctors_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Impostazioni ----------------------------------------------------------------
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Documenti del paziente (i file stanno su disco, qui i metadati) -------------
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientDocument_storageKey_key" ON "PatientDocument"("storageKey");
CREATE INDEX "PatientDocument_patientId_createdAt_idx" ON "PatientDocument"("patientId", "createdAt");
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ordinamento dei pazienti per data di inserimento.
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");
