import { connection } from "next/server";
import { db } from "@/lib/db";

/** Usato dall'healthcheck di Docker: risponde 200 solo se il database è raggiungibile. */
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
