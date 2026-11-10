import { expect, test, type Page } from "@playwright/test";

// Un unico percorso, nell'ordine in cui lo farebbe uno studio appena installato.
// I passi condividono il database, quindi vanno eseguiti in sequenza.
test.describe.configure({ mode: "serial" });
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const PASSWORD = "password-di-prova-1";
const admin = { name: "Anna Bianchi", email: "admin@studio.test" };
const doctor = { name: "Marco Rossi", label: "Dott. Marco Rossi", email: "rossi@studio.test" };
// Medico senza email: esiste in agenda, ma non può accedere.
const otherDoctor = { name: "Elena Verdi", label: "Dott.ssa Elena Verdi" };
const reception = { name: "Giulia Neri", email: "reception@studio.test" };

// Next.js tiene montate (nascoste) le pagine già visitate: i selettori
// puntano sempre alla finestra di dialogo aperta o al contenuto visibile.
const dialog = (page: Page) => page.locator("[data-slot=dialog-content]").last();
const submit = (page: Page) =>
  page.locator(":is(main, [data-slot=dialog-content]) button[type=submit]:visible").last();

/** Domani, nel formato dei campi data (il test gira con il fuso Europe/Rome). */
function tomorrow(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(date);
}

/**
 * Fa comportare Chromium come Safari: cliccando un pulsante il fuoco non passa
 * al pulsante e il campo attivo lo perde. Così i menu a tendina vengono provati
 * anche nel caso in cui si chiudevano prima di ricevere il clic.
 */
async function emulateSafariFocus(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener("mousedown", (event) => {
      const target = event.target as HTMLElement | null;
      if (!event.defaultPrevented && target?.closest("button")) {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }
    });
  });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await submit(page).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("!");
}

async function openAgenda(page: Page, day?: string) {
  await page.goto(day ? `/agenda?data=${day}` : "/agenda");
  await expect(page.locator(".rbc-time-view")).toBeVisible();
}

async function pickPatient(page: Page, text: string, fullName: string) {
  await page.locator("#appointment-patient").fill(text);
  await dialog(page).getByRole("button", { name: fullName }).click();
}

test("primo avvio: la configurazione crea l'amministratore e apre la home", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup/);
  await page.locator("#name").fill(admin.name);
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#passwordConfirm").fill(PASSWORD);
  await submit(page).click();
  await expect(page.getByRole("heading", { name: "Buon", exact: false })).toBeVisible();
  await expect(page.getByText("Appuntamenti per mese")).toBeVisible();

  // A configurazione fatta, /setup non è più disponibile.
  await page.goto("/setup");
  await expect(page).not.toHaveURL(/\/setup/);
});

test("senza sessione si viene mandati al login; password errata rifiutata", async ({ page }) => {
  await page.goto("/pazienti");
  await expect(page).toHaveURL(/\/login/);
  await page.locator("#email").fill(admin.email);
  await page.locator("#password").fill("password-sbagliata");
  await submit(page).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Email o password non corretti.");
  await expect(page.locator("#email")).toHaveValue(admin.email);
});

test("l'amministratore crea utenti (anche un medico senza email) e sale con i loro medici", async ({ page }) => {
  await login(page, admin.email);
  await page.getByRole("link", { name: "Utenti" }).click();

  await page.getByRole("button", { name: "Nuovo utente" }).click();
  await page.locator("#user-role").selectOption("DOCTOR");
  await page.locator("#user-title").selectOption("DOTT");
  await page.locator("#user-name").fill(doctor.name);
  await page.locator("#user-email").fill(doctor.email);
  await page.locator("#user-password").fill(PASSWORD);
  await submit(page).click();
  await expect(page.getByRole("cell", { name: doctor.email })).toBeVisible();

  await page.getByRole("button", { name: "Nuovo utente" }).click();
  await page.locator("#user-role").selectOption("DOCTOR");
  await page.locator("#user-title").selectOption("DOTT_SSA");
  await page.locator("#user-name").fill(otherDoctor.name);
  await submit(page).click();
  await expect(page.getByRole("row", { name: new RegExp(otherDoctor.label) })).toContainText("Senza accesso");

  // Per la reception l'email è obbligatoria.
  await page.getByRole("button", { name: "Nuovo utente" }).click();
  await page.locator("#user-role").selectOption("RECEPTION");
  await page.locator("#user-name").fill(reception.name);
  await page.locator("#user-email").fill(reception.email);
  await page.locator("#user-password").fill(PASSWORD);
  await submit(page).click();
  await expect(page.getByRole("cell", { name: reception.email })).toBeVisible();

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
  for (const [name, color, doctorLabel] of [
    ["Ambulatorio 1", "#3b82f6", doctor.label],
    ["Ambulatorio 2", "#10b981", otherDoctor.label],
  ]) {
    await page.getByRole("button", { name: "Nuova sala" }).click();
    await page.locator("#room-name").fill(name);
    await page.locator("#room-color").fill(color);
    await dialog(page).getByLabel(doctorLabel).check();
    await submit(page).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText(doctorLabel);
  }
});

test("paziente: codice fiscale calcolato, documenti, ricerca e ordinamento", async ({ page }) => {
  await emulateSafariFocus(page);
  await login(page, admin.email);
  await page.goto("/pazienti/nuovo");
  await page.locator("#firstName").fill("Mario");
  await page.locator("#lastName").fill("Rossi");
  await page.locator("#sex").selectOption("M");
  await page.locator("#birthDate").fill("1985-12-10");
  await page.locator("#birthPlace").fill("san giuliano");
  await page.getByRole("button", { name: /San Giuliano Terme \(PI\)/ }).click();
  await page.getByRole("button", { name: "Calcola" }).click();
  await expect(page.locator("#fiscalCode")).toHaveValue("RSSMRA85T10A562S");
  await page.locator("#phone").fill("333 1234567");
  await page.locator("#email").fill("mario.rossi@example.test");
  await submit(page).click();
  await expect(page).toHaveURL(/\/pazienti\/.+/);
  await expect(page.getByRole("heading", { name: "Rossi Mario" })).toBeVisible();

  // Un codice fiscale con il carattere di controllo sbagliato viene rifiutato.
  await page.locator("#fiscalCode:visible").fill("RSSMRA85T10A562X");
  await submit(page).click();
  await expect(page.getByText("Codice fiscale non valido").first()).toBeVisible();

  // Documenti: caricamento e apertura.
  await page.locator("input[type=file]").setInputFiles({
    name: "referto.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
  });
  const link = page.locator('a[href^="/api/documenti/"]:not([href$="scarica"])', { hasText: "referto.pdf" });
  await expect(link).toBeVisible();
  const response = await page.request.get((await link.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  // Un tipo di file non ammesso viene rifiutato.
  await page.locator("input[type=file]").setInputFiles({
    name: "virus.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ"),
  });
  await expect(page.getByText("Tipo di file non ammesso: virus.exe")).toBeVisible();

  // Ricerca per email e per parole in ordine inverso; ordinamento.
  await page.goto("/pazienti?q=mario.rossi%40example");
  await expect(page.getByRole("link", { name: "Rossi" })).toBeVisible();
  await page.goto("/pazienti?q=mario+rossi&ordine=recenti");
  await expect(page.getByRole("combobox", { name: "Ordina" })).toHaveValue("recenti");
  await expect(page.getByRole("link", { name: "Rossi" })).toBeVisible();
});

test("la reception prenota (anche con nuovo paziente al volo) e le sovrapposizioni vengono rifiutate", async ({
  page,
}) => {
  await emulateSafariFocus(page);
  await login(page, reception.email);
  // La reception non vede né raggiunge le pagine di amministrazione.
  await expect(page.locator("aside").getByRole("link", { name: "Utenti" })).toHaveCount(0);
  await page.goto("/utenti");
  await expect(page.getByText("Pagina non trovata")).toBeVisible();

  await openAgenda(page, tomorrow());
  await expect(page.locator(".rbc-time-header")).toContainText("Ambulatorio 1");
  await expect(page.locator(".rbc-time-header")).toContainText("Ambulatorio 2");

  await page.getByRole("button", { name: "Nuovo appuntamento" }).click();
  await pickPatient(page, "rossi", "Rossi Mario");
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 1" });
  // I medici della sala vengono proposti per primi.
  await expect(page.locator("#appointment-doctor")).toHaveValue(/.+/);
  await expect(page.locator("#appointment-doctor option:checked")).toHaveText(doctor.label);
  await page.locator("#appointment-date").fill(tomorrow());
  await page.locator("#appointment-start").fill("10:00");
  await page.locator("#appointment-end").fill("10:30");
  await page.locator("#appointment-reason").fill("Visita di controllo");
  await submit(page).click();
  await expect(page.locator(".rbc-event")).toHaveCount(1);
  await expect(page.locator(".rbc-event")).toContainText("Rossi Mario");

  // Nuovo paziente creato senza lasciare il form appuntamento.
  await page.getByRole("button", { name: "Nuovo appuntamento" }).click();
  await page.locator("#appointment-patient").fill("bianchi luca");
  await dialog(page).getByRole("button", { name: /Nuovo paziente/ }).click();
  await expect(page.locator("#lastName")).toHaveValue("Bianchi");
  await expect(page.locator("#firstName")).toHaveValue("Luca");
  await page.locator("#phone").fill("333 7654321");
  await dialog(page).locator("button[type=submit]").click();
  await expect(page.locator("#appointment-patient")).toHaveText("Bianchi Luca");

  // Stessa sala, orario sovrapposto, altro medico.
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 1" });
  await page.locator("#appointment-doctor").selectOption({ label: otherDoctor.label });
  await page.locator("#appointment-date").fill(tomorrow());
  await page.locator("#appointment-start").fill("10:15");
  await page.locator("#appointment-end").fill("10:45");
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("La sala è già occupata in questo orario.");

  // Stesso medico, altra sala.
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 2" });
  await page.locator("#appointment-doctor").selectOption({ label: doctor.label });
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("Il medico ha già un appuntamento in questo orario.");

  // Altro medico e altra sala: nessun conflitto, e lo segniamo già come confermato.
  await page.locator("#appointment-doctor").selectOption({ label: otherDoctor.label });
  await dialog(page).getByRole("radio", { name: "Confermato" }).click();
  await submit(page).click();
  await expect(page.locator(".rbc-event")).toHaveCount(2);
});

test("promemoria: messaggio copiato, segnato come inviato, stato confermato", async ({ page }) => {
  await login(page, reception.email);
  await page.getByRole("link", { name: "Promemoria" }).click();
  await page.getByRole("link", { name: "Entro 2 giorni" }).click();
  const row = page.locator("li", { hasText: "Rossi Mario" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Copia messaggio" }).click();
  await expect(page.getByText("Messaggio copiato!")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Gentile Mario Rossi");
  expect(text).toContain("con il dott. Marco Rossi");
  expect(text).toContain('scriva "Confermo"');

  await row.getByRole("radio", { name: "Confermato" }).click();
  await expect(row.getByRole("radio", { name: "Confermato" })).toHaveAttribute("aria-checked", "true");
  await row.getByRole("checkbox", { name: "Inviato" }).click();
  await expect(row.getByRole("checkbox", { name: "Inviato" })).toHaveAttribute("aria-checked", "true");
  // Ricaricando la pagina gli stati restano salvati.
  await page.reload();
  const saved = page.locator("li", { hasText: "Rossi Mario" });
  await expect(saved.getByRole("checkbox", { name: "Inviato" })).toHaveAttribute("aria-checked", "true");
  await expect(saved.getByRole("radio", { name: "Confermato" })).toHaveAttribute("aria-checked", "true");
});

test("il medico vede la propria agenda e non modifica quella dei colleghi", async ({ page }) => {
  await login(page, doctor.email);
  await openAgenda(page, tomorrow());
  await expect(page.getByLabel("Medico", { exact: true })).not.toHaveValue("tutti");
  await expect(page.locator(".rbc-event")).toHaveCount(1);

  await page.getByLabel("Medico", { exact: true }).selectOption("tutti");
  await expect(page.locator(".rbc-event")).toHaveCount(2);
  await page.locator(".rbc-event", { hasText: otherDoctor.label }).click();
  await expect(dialog(page).getByText("Puoi solo consultare questo appuntamento.")).toBeVisible();
  await expect(page.locator("#appointment-reason")).toBeDisabled();
  await expect(dialog(page).locator("button[type=submit]")).toHaveCount(0);
});

test("stampa della giornata e cambio giorno dalla striscia", async ({ page }) => {
  await login(page, admin.email);
  await openAgenda(page);
  // La striscia dei giorni: il giorno dopo "oggi".
  await page.getByRole("toolbar", { name: "Giorni" }).locator("[aria-current=date] + button").click();
  await expect(page).toHaveURL(new RegExp(`data=${tomorrow()}`));
  await expect(page.locator(".rbc-event")).toHaveCount(2);

  // In agenda il motivo della visita si vede per intero.
  await expect(page.locator(".rbc-event", { hasText: "Rossi Mario" })).toContainText("Visita di controllo");

  await page.goto(`/agenda/stampa?data=${tomorrow()}`);
  const entries = page.locator("tbody");
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText("10:00–10:30");
  await expect(entries.first()).toContainText("30 min");
  await expect(entries.first()).toContainText("Rossi Mario");
  await expect(entries.first()).toContainText(doctor.label);
  // Il motivo della visita, in un riquadro a parte.
  await expect(entries.first()).toContainText("Motivo della visita");
  await expect(entries.first()).toContainText("Visita di controllo");
});

test("stop: blocca sala e medici, si vede a strisce e compare nella stampa", async ({ page }) => {
  await login(page, reception.email);
  await openAgenda(page, tomorrow());

  // Non si può mettere uno stop sopra una visita già prenotata.
  await page.getByRole("button", { name: "Crea stop" }).click();
  await page.locator("#stop-note").fill("Pausa pranzo");
  await page.locator("#stop-room").selectOption({ label: "Ambulatorio 1" });
  // I medici della sala sono già selezionati.
  await expect(dialog(page).getByLabel(doctor.label)).toBeChecked();
  await page.locator("#stop-date").fill(tomorrow());
  await page.locator("#stop-start").fill("10:15");
  await page.locator("#stop-end").fill("11:00");
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toContainText("c'è già 1 appuntamento");

  await page.locator("#stop-start").fill("13:00");
  await page.locator("#stop-end").fill("14:00");
  await submit(page).click();
  const stop = page.locator(".rbc-event.agenda-stop");
  await expect(stop).toBeVisible();
  await expect(stop).toContainText("Pausa pranzo");
  await expect(stop).toContainText(doctor.label);

  // Sopra uno stop non si prenota: né nella sua sala, né con i suoi medici altrove.
  await page.getByRole("button", { name: "Nuovo appuntamento" }).click();
  await pickPatient(page, "rossi", "Rossi Mario");
  await page.locator("#appointment-room").selectOption({ label: "Ambulatorio 2" });
  await page.locator("#appointment-doctor").selectOption({ label: doctor.label });
  await page.locator("#appointment-date").fill(tomorrow());
  await page.locator("#appointment-start").fill("13:30");
  await page.locator("#appointment-end").fill("14:00");
  await submit(page).click();
  await expect(dialog(page).getByRole("alert")).toHaveText("In questo orario c'è uno stop: «Pausa pranzo».");
  await page.keyboard.press("Escape");

  await page.goto(`/agenda/stampa?data=${tomorrow()}`);
  await expect(page.locator("tbody").last()).toContainText("STOP");
  await expect(page.locator("tbody").last()).toContainText("Pausa pranzo");

  // Lo stop si modifica e si elimina dal suo popup.
  await openAgenda(page, tomorrow());
  await page.locator(".rbc-event.agenda-stop").click();
  page.once("dialog", (confirm) => void confirm.accept());
  await dialog(page).getByRole("button", { name: "Elimina stop" }).click();
  await expect(page.locator(".rbc-event.agenda-stop")).toHaveCount(0);
});

test("impostazioni: testo del promemoria personalizzato", async ({ page }) => {
  await login(page, admin.email);
  await page.getByRole("link", { name: "Impostazioni" }).click();
  await page.locator("#reminderTemplate").fill("Ciao {nome}, ci vediamo il {data} alle {ora}!");
  await expect(page.getByText("Ciao Mario, ci vediamo il 10 novembre 2026 alle 09:30!")).toBeVisible();
  await submit(page).click();
  await expect(page.getByText("Impostazioni salvate")).toBeVisible();

  await page.goto("/promemoria?entro=2");
  await page.locator("li", { hasText: "Bianchi Luca" }).getByRole("button", { name: "Copia messaggio" }).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^Ciao Luca, ci vediamo il \d+ \w+ \d{4} alle 10:15!$/);
});

test("disdetta, eliminazione paziente e utente disattivato", async ({ page }) => {
  await login(page, admin.email);
  await openAgenda(page, tomorrow());
  await page.locator(".rbc-event", { hasText: otherDoctor.label }).click();
  await dialog(page).getByRole("button", { name: "Disdici appuntamento" }).click();
  await expect(page.locator(".rbc-event")).toHaveCount(1);
  await page.getByLabel("Mostra disdetti").check();
  await expect(page.locator(".rbc-event")).toHaveCount(2);

  // Eliminazione del paziente: spariscono anche i suoi appuntamenti.
  await page.goto("/pazienti?q=bianchi");
  await page.locator("main").getByRole("link", { name: "Bianchi", exact: true }).click();
  await page.getByRole("button", { name: "Elimina paziente" }).click();
  await expect(dialog(page)).toContainText("1 appuntamento");
  await dialog(page).getByRole("button", { name: "Elimina definitivamente" }).click();
  await expect(page).toHaveURL(/\/pazienti$/);
  await page.goto("/pazienti?q=bianchi");
  await expect(page.getByText("Nessun paziente trovato.")).toBeVisible();

  await page.goto("/utenti");
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
