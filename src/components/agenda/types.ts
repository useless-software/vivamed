import type { Role } from "@/lib/permissions";
import type { t } from "@/lib/messages";

export type Status = keyof typeof t.status;
export type PatientRef = { id: string; label: string };

/** Appuntamento così come viaggia dal server al calendario (date in ISO). */
export type AgendaEvent = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: Status;
  reason: string | null;
  doctorId: string;
  roomId: string;
  patient: PatientRef;
};

export type DoctorOption = { id: string; name: string; active: boolean };
export type RoomOption = { id: string; name: string; color: string; active: boolean };
export type AgendaGroup = "none" | "room" | "doctor";

export type AgendaProps = {
  events: AgendaEvent[];
  doctors: DoctorOption[];
  rooms: RoomOption[];
  user: { id: string; role: Role };
  filters: { doctor: string; room: string };
  /** Giorno richiesto nell'URL (yyyy-MM-dd) oppure null = oggi. */
  date: string | null;
  view: "day" | "week";
  group: AgendaGroup;
  preselectedPatient: PatientRef | null;
};
