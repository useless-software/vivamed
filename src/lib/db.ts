import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL non è impostata: controlla il file .env");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function getClient(): PrismaClient {
  // In sviluppo il modulo viene ricaricato a ogni modifica: riusiamo il client
  // per non esaurire le connessioni al database.
  return (globalForPrisma.prisma ??= createClient());
}

/**
 * Client Prisma, creato al primo utilizzo: così la build (che importa questo
 * modulo ma non interroga mai il database) funziona anche senza DATABASE_URL.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
