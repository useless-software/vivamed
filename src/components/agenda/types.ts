import type { DoctorTitle } from "@/lib/doctors";
import type { Role } from "@/lib/permissions";
import type { t } from "@/lib/messages";

export type Status = keyof typeof t.status;
export type Outcome = "COMPLETED" | "NO_SHOW";
export type PatientRef = { id: string; label: string };

/** Appuntamento così come viaggia dal server al calendario (date in ISO). */
export type AgendaEvent = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: Status;
  outcome: Outcome | null;
  reason: string | null;
  doctorId: string;
  roomId: string;
  patient: PatientRef;
};

export type DoctorOption = { id: string; name: string; title: DoctorTitle; active: boolean };
export type RoomOption = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  /** Medici assegnati alla sala: proposti per primi nel form. */
  doctors: { id: string }[];
};

export type AgendaProps = {
  events: AgendaEvent[];
  doctors: DoctorOption[];
  rooms: RoomOption[];
  user: { id: string; role: Role };
  /** Medico selezionato nel filtro, oppure "tutti". */
  doctorFilter: string;
  /** Giorno richiesto nell'URL (yyyy-MM-dd) oppure null = oggi. */
  date: string | null;
  preselectedPatient: PatientRef | null;
};
