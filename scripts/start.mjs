// Avvio di vivamed in produzione senza Docker (dopo `npm run build`).
//
// La build "standalone" di Next.js non include i file statici: li copiamo
// accanto al server e poi lo avviamo, leggendo la configurazione da .env.
import "dotenv/config";
import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("Build non trovata: esegui prima `npm run build`.");
  process.exit(1);
}

cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });

process.env.NODE_ENV = "production";
// Ascolta su tutte le interfacce, così gli altri computer dello studio possono collegarsi.
process.env.HOSTNAME ??= "0.0.0.0";
process.env.PORT ??= "3000";

await import(path.join(standalone, "server.js"));
