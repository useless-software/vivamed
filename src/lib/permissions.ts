// Unico punto in cui si decide chi può fare cosa. Modulo puro (niente database,
// niente cookie) così è facile da testare e riusabile anche nel client.

export type Role = "ADMIN" | "RECEPTION" | "DOCTOR";

export type Permission =
  | "users.manage"
  | "rooms.manage"
  | "patients.read"
  | "patients.write"
  /** Eliminare un paziente con appuntamenti e documenti. */
  | "patients.delete"
  /** Impostazioni dello studio (testo promemoria, temi…). */
  | "settings.manage"
  | "appointments.read"
  /** Gestire gli appuntamenti di qualunque medico. */
  | "appointments.writeAll"
  /** Gestire solo gli appuntamenti di cui si è il medico. */
  | "appointments.writeOwn";

const everyone: Permission[] = ["patients.read", "patients.write", "appointments.read"];

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    ...everyone,
    "users.manage",
    "rooms.manage",
    "patients.delete",
    "settings.manage",
    "appointments.writeAll",
    "appointments.writeOwn",
  ]),
  RECEPTION: new Set<Permission>([...everyone, "appointments.writeAll", "appointments.writeOwn"]),
  DOCTOR: new Set<Permission>([...everyone, "appointments.writeOwn"]),
};

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}

/** Può creare o modificare un appuntamento assegnato al medico `doctorId`? */
export function canWriteAppointment(user: { id: string; role: Role }, doctorId: string): boolean {
  if (can(user.role, "appointments.writeAll")) return true;
  return can(user.role, "appointments.writeOwn") && user.id === doctorId;
}
