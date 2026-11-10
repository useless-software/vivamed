// Test di integrazione: richiede un PostgreSQL vero (DATABASE_URL) con le
// migrazioni applicate. Verifica la garanzia più importante dell'agenda: è il
// database stesso a rifiutare due appuntamenti sovrapposti, anche se il
// controllo applicativo venisse saltato (ad esempio da due richieste simultanee).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isUniqueViolation, overlapViolation } from "@/lib/db-errors";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const tag = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const at = (hour: number, minute = 0) => new Date(Date.UTC(2031, 0, 6, hour, minute));

let patientId: string;
let doctorA: string;
let doctorB: string;
let roomA: string;
let roomB: string;

beforeAll(async () => {
  const user = (name: string) =>
    db.user.create({ data: { name, email: `${name}-${tag}@example.test`, passwordHash: "x", role: "DOCTOR" } });
  doctorA = (await user("a")).id;
  doctorB = (await user("b")).id;
  roomA = (await db.room.create({ data: { name: `A-${tag}` } })).id;
  roomB = (await db.room.create({ data: { name: `B-${tag}` } })).id;
  patientId = (await db.patient.create({ data: { firstName: "Test", lastName: tag } })).id;
  await db.appointment.create({
    data: { patientId, doctorId: doctorA, roomId: roomA, startsAt: at(10), endsAt: at(11) },
  });
});

afterAll(async () => {
  await db.appointment.deleteMany({ where: { patientId } });
  await db.patient.delete({ where: { id: patientId } });
  await db.room.deleteMany({ where: { id: { in: [roomA, roomB] } } });
  await db.user.deleteMany({ where: { id: { in: [doctorA, doctorB] } } });
  await db.$disconnect();
});

const create = (data: { doctorId: string; roomId: string; startsAt: Date; endsAt: Date; status?: "CANCELLED" }) =>
  db.appointment.create({ data: { patientId, ...data } });

describe("vincoli anti-sovrapposizione", () => {
  it("rifiuta la stessa sala nello stesso orario", async () => {
    const error = await create({ doctorId: doctorB, roomId: roomA, startsAt: at(10, 30), endsAt: at(11, 30) }).catch(
      (e: unknown) => e,
    );
    expect(overlapViolation(error)).toBe("room");
  });

  it("rifiuta lo stesso medico nello stesso orario", async () => {
    const error = await create({ doctorId: doctorA, roomId: roomB, startsAt: at(9, 30), endsAt: at(10, 15) }).catch(
      (e: unknown) => e,
    );
    expect(overlapViolation(error)).toBe("doctor");
  });

  it("accetta appuntamenti consecutivi (fine = inizio del successivo)", async () => {
    const next = await create({ doctorId: doctorA, roomId: roomA, startsAt: at(11), endsAt: at(11, 30) });
    expect(next.id).toBeTruthy();
  });

  it("accetta altra sala e altro medico nello stesso orario", async () => {
    const parallel = await create({ doctorId: doctorB, roomId: roomB, startsAt: at(10), endsAt: at(11) });
    expect(parallel.id).toBeTruthy();
  });

  it("ignora gli appuntamenti annullati", async () => {
    const cancelled = await create({
      doctorId: doctorA,
      roomId: roomA,
      startsAt: at(10),
      endsAt: at(11),
      status: "CANCELLED",
    });
    expect(cancelled.id).toBeTruthy();
    // ...ma riattivarlo sopra un altro appuntamento non è permesso.
    const error = await db.appointment
      .update({ where: { id: cancelled.id }, data: { status: "PENDING" } })
      .catch((e: unknown) => e);
    expect(overlapViolation(error)).not.toBeNull();
  });

  it("rifiuta una fine precedente all'inizio", async () => {
    await expect(create({ doctorId: doctorB, roomId: roomB, startsAt: at(15), endsAt: at(14) })).rejects.toThrow();
  });

  it("riconosce i duplicati (nome sala)", async () => {
    const error = await db.room.create({ data: { name: `A-${tag}` } }).catch((e: unknown) => e);
    expect(isUniqueViolation(error)).toBe(true);
    expect(overlapViolation(error)).toBeNull();
  });
});
