import { defineConfig, devices } from "@playwright/test";

// Test end-to-end: guidano un browser vero contro un vivamed già avviato.
// Richiedono un database vuoto (partono dalla configurazione iniziale).
//
//   npm run build && npm run start      # in un terminale
//   npm run test:e2e                    # in un altro
//
// E2E_BASE_URL permette di puntare a un'altra istanza (es. quella in Docker).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
