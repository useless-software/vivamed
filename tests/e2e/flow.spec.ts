import { expect, test, type Page } from "@playwright/test";

// Un unico percorso, nell'ordine in cui lo farebbe uno studio appena installato.
// I passi condividono il database, quindi vanno eseguiti in sequenza.
test.describe.configure({ mode: "serial" });

const PASSWORD = "password-di-prova-1";
const admin = { name: "Anna Bianchi", email: "admin@studio.test" };
const doctor = { name: "Dott. Marco Rossi", email: "rossi@studio.test" };
const otherDoctor = { name: "Dott.ssa Elena Verdi", email: "verdi@studio.test" };
const reception = { name: "Giulia Neri", email: "reception@studio.test" };

// Next.js tiene montate (nascoste) le pagine già visitate: i selettori
// puntano sempre alla finestra di dialogo aperta o al contenuto visibile.
const dialog = (page: Page) => page.locator("[data-slot=dialog-content]");
const submit = (page: Page) => page.locator(":is(main, [data-slot=dialog-content]) button[type=submit]:visible");

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await submit(page).click();
  await expect(page).toHaveURL(/\/agenda/);
  await expect(page.locator(".rbc-time-view")).toBeVisible();
}

async function pickPatient(page: Page, text: string, fullName: string) {
  await page.locator("#appointment-patient").fill(text);
  await dialog(page).getByRole("button", { name: fullName }).click();
}

test("primo avvio: la configurazione crea l'amministratore", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup/);
  await page.locator("#name").fill(admin.name);
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#passwordConfirm").fill(PASSWORD);
  await submit(page).click();
  await expect(page).toHaveURL(/\/agenda/);

  // A configurazione fatta, /setup non è più disponibile.
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/(login|agenda)/);
});

test("senza sessione si viene mandati al login; password errata rifiutata", async ({ page }) => {
  await page.goto("/pazienti");
  await expect(page).toHaveURL(/\/login/);
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill("password-sbagliata");
  await submit(page).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Email o password non corretti.");
  // L'email resta compilata dopo l'errore.
  await expect(page.locator("#email")).toHaveValue(admin.email);
});

test("l'amministratore crea utenti, sale e un paziente", async ({ page }) => {
  await login(page, admin.email);

  await page.getByRole("link", { name: "Utenti" }).click();
  for (const [user, role] of [
    [doctor, "DOCTOR"],
    [otherDoctor, "DOCTOR"],
    [reception, "RECEPTION"],
  ] as const) {
    await page.getByRole("button", { name: "Nuovo utente" }).click();
    await page.locator("#user-name").fill(user.name);
    await page.locator("#user-email").fill(user.email);
    await page.locator("#user-role").selectOption(role);
    await page.locator("#user-password").fill(PASSWORD);
    await submit(page).click();
    await expect(page.getByRole("cell", { name: user.email })).toBeVisible();
  }

  // Email duplicata: errore, e il form non perde i dati.
  await page.getByRole("button", { name: "Nuovo utente" }).click();
  await page.locator("#user-name").fill("Doppione");
  await page.locator("#user-email").fill(doctor.email);
  await page.locator("#user-password").fill(PASSWORD);
  await submit(page).click();
  await expect(dialog(page).getByText("Esiste già un utente con questa email.").first()).toBeVisible();
  await expect(page.locator("#user-name")).toHaveValue("Doppione");
  await dialog(page).getByRole("button", { name: "Annulla" }).click();

  await page.getByRole("link", { name: "Sale" }).click();
  for (const [name, color] of [
    ["Ambulatorio 1", "#3b82f6"],
    ["Ambulatorio 2", "#10b981"],
  ]) {
    await page.getByRole("button", { name: "Nuova sala" }).click();
    await page.locator("#room-name").fill(name);
    await page.locator("#room-color").fill(color);
    await submit(page).click();
    await expect(page.getByRole("cell", { name })).toBeVisible();
  }

  await page.getByRole("link", { name: "Pazienti" }).click();
  await page.getByRole("link", { name: "Nuovo paziente" }).click();
  await page.locator("#firstName").fill("Luca");
  await page.locator("#lastName").fill("Ferrari");
  await page.locator("#fiscalCode").fill("frrlcu80a01h501x");
  await page.locator("#birthDate").fill("1980-01-01");
  await page.locator("#phone").fill("333 1234567");
  await submit(page).click();
  await expect(page).toHaveURL(/\/pazienti\/.+/);
  await expect(page.getByRole("heading", { name: "Ferrari Luca" })).toBeVisible();

  // La ricerca trova il paziente anche con le parole in ordine inverso.
  await page.goto("/pazienti?q=luca+ferr");
  await expect(page.getByRole("link", { name: "Ferrari" })).toBeVisible();
  await page.goto("/pazienti?q=inesistente");
  await expect(page.getByText("Nessun paziente trovato.")).toBeVisible();
});

test("la reception prenota; le sovrapposizioni vengono rifiutate", async ({ page }) => {
  await login(page, reception.email);

  // La reception non vede né raggiunge le pagine di amministrazione.
  await expect(page.locator("aside").getByRole("link", { name: "Utenti" })).toHaveCount(0);
  await page.goto("/utenti");
  await expect(page.getByText("Pagina non trovata")).toBeVisible();
  await page.goto("/sale");
  await expect(page.getByText("Pagina non trovata")).toBeVisible();

  await page.goto("/agenda");
  await page.getByRole("button", { name: "Nuovo appuntamento" }).click();
  await pickPatient(page, "ferr", "Ferrari Luca");
  await page.locator("#appointment-doctor").selectOption({ label: doctor.name });
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 1" });
  await page.locator("#appointment-start").fill("10:00");
  await page.locator("#appointment-end").fill("10:30");
  await page.locator("#appointment-reason").fill("Visita di controllo");
  await submit(page).click();
  await expect(page.locator(".rbc-event")).toHaveCount(1);
  await expect(page.locator(".rbc-event")).toContainText("Ferrari Luca");

  // Stessa sala, orario sovrapposto, altro medico.
  await page.getByRole("button", { name: "Nuovo appuntamento" }).click();
  await pickPatient(page, "ferr", "Ferrari Luca");
  await page.locator("#appointment-doctor").selectOption({ label: otherDoctor.name });
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 1" });
  await page.locator("#appointment-start").fill("10:15");
  await page.locator("#appointment-end").fill("10:45");
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("La sala è già occupata in questo orario.");

  // Stesso medico, altra sala.
  await page.locator("#appointment-doctor").selectOption({ label: doctor.name });
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 2" });
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Il medico ha già un appuntamento in questo orario.");

  // Altro medico e altra sala: nessun conflitto.
  await page.locator("#appointment-doctor").selectOption({ label: otherDoctor.name });
  await submit(page).click();
  await expect(page.locator(".rbc-event")).toHaveCount(2);
});

test("il medico vede la propria agenda e non modifica quella dei colleghi", async ({ page }) => {
  await login(page, doctor.email);
  await expect(page.getByLabel("Medico", { exact: true })).toHaveValue(/.+/);
  await expect(page.locator(".rbc-event")).toHaveCount(1);

  // Il proprio appuntamento si può completare.
  await page.locator(".rbc-event").click();
  await page.locator("#appointment-status").selectOption("COMPLETED");
  await submit(page).click();
  await expect(dialog(page)).toBeHidden();

  // Quello della collega è in sola lettura.
  await page.getByLabel("Medico", { exact: true }).selectOption("tutti");
  await expect(page.locator(".rbc-event")).toHaveCount(2);
  await page.locator(".rbc-event", { hasText: otherDoctor.name }).click();
  await expect(dialog(page).getByText("Puoi solo consultare questo appuntamento.")).toBeVisible();
  await expect(page.locator("#appointment-reason")).toBeDisabled();
  await expect(dialog(page).locator("button[type=submit]")).toHaveCount(0);
});

test("annullare un appuntamento libera la sala; un utente disattivato non entra più", async ({ page }) => {
  await login(page, admin.email);
  await page.locator(".rbc-event", { hasText: otherDoctor.name }).click();
  await dialog(page).getByRole("button", { name: "Annulla appuntamento" }).click();
  await expect(page.locator(".rbc-event")).toHaveCount(1);
  await page.getByLabel("Mostra annullati").check();
  await expect(page.locator(".rbc-event")).toHaveCount(2);

  await page.getByRole("link", { name: "Utenti" }).click();
  await page.getByRole("row", { name: new RegExp(reception.email) }).getByRole("button", { name: "Modifica" }).click();
  await page.getByLabel("Account attivo").uncheck();
  await submit(page).click();
  await expect(page.getByRole("row", { name: new RegExp(reception.email) })).toContainText("Disattivato");

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator("#email").fill(reception.email);
  await page.locator("#password").fill(PASSWORD);
  await submit(page).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Email o password non corretti.");
});
