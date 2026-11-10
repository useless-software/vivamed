-- Vincoli che Prisma non sa esprimere nello schema: li gestiamo in SQL.
-- btree_gist permette di combinare l'uguaglianza (sala / medico) con la
-- sovrapposizione di intervalli nello stesso vincolo EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_time_order_check" CHECK ("endsAt" > "startsAt");

-- Una sala non può ospitare due appuntamenti attivi nello stesso momento.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_room_no_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');

-- Un medico non può avere due appuntamenti attivi nello stesso momento.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_doctor_no_overlap"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tstzrange("startsAt", "endsAt", '[)') WITH &&
  ) WHERE (status <> 'CANCELLED');
