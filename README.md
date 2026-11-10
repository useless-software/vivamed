<div align="center">

<img src="https://raw.githubusercontent.com/itzzNicholas/vivamed/refs/heads/main/vivamed.png" alt="VivaMed Logo" width="180">

# vivaMed

**Il gestionale open source, semplice e potente per studi medici e piccole cliniche private.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/itzzNicholas/vivamed)

---

</div>

## 🩺 Cos'è vivamed?

**vivamed** è un gestionale studiato per semplificare la quotidianità di piccole cliniche private e studi medici. Totalmente **gratuito e open source**, puoi installarlo facilmente nella tua rete intranet, configurare gli account per la reception e i medici, gestire le sale e iniziare subito a lavorare!

---

## 🚀 Perché scegliere vivamed?

La maggior parte dei gestionali medici sul mercato soffre di due grandi problemi: sono spesso **eccessivamente complessi** e hanno **costi elevati**, con funzionalità extra (come le integrazioni esterne) bloccate dietro paywall.

Con **vivamed** stiamo cambiando questo approccio:

* ⚡ **Semplice e Intuitivo:** Un'interfaccia moderna e pulita, pensata per chi deve usarla tutti i giorni senza perdere tempo.
* 🛠️ **Potente e Completo:** Tutte le funzionalità essenziali e avanzate incluse di base, senza costi nascosti.
* 🔓 **Trasparente e Personalizzabile:** Il codice è 100% pubblico. Se hai esigenze particolari, puoi estenderlo o sviluppare le tue integrazioni su misura.

> ⚠️ **Nota sulla Licenza:** Il progetto è rilasciato sotto licenza open source. Ti chiediamo di consultare e rispettare i termini specificati nel file [`LICENSE`](LICENSE).

---

## ✅ Cosa c'è già

- 🏠 **Home con statistiche:** appuntamenti di oggi e domani, pazienti della settimana, conferme, promemoria da inviare e grafico mensile.
- 👥 **Account e ruoli:** amministratore, reception e medico (con titolo: Dott., Dott.ssa, Prof.…). Un medico può esistere anche senza email: compare in agenda ma non accede a vivamed.
- 🗂️ **Anagrafica pazienti:** ricerca per nome, cognome, codice fiscale, telefono, email o luogo di nascita; ordinamenti; **calcolo del codice fiscale** con l'elenco ufficiale dei comuni ISTAT; **documenti** allegati (PDF, immagini, Office…); eliminazione completa.
- 🚪 **Sale:** gli ambulatori dello studio, ognuno con il proprio colore e i propri medici.
- 📅 **Agenda giornaliera:** una colonna per sala, striscia dei giorni per spostarsi al volo, trascinamento degli appuntamenti, stato **in sospeso / confermato / disdetto**, nuovo paziente creato senza lasciare la prenotazione, **stampa della giornata**. Due appuntamenti non possono sovrapporsi nella stessa sala o per lo stesso medico: lo garantisce il database.
- 🔔 **Promemoria:** gli appuntamenti dei prossimi giorni con il messaggio pronto da copiare su WhatsApp (testo personalizzabile nelle impostazioni) e la spunta "inviato".
- 🎉 **Animazioni e feste:** coriandoli a ogni salvataggio e colori a tema a Natale, Capodanno, Carnevale, San Valentino, Pasqua, 2 giugno e Halloween (disattivabili dalle impostazioni).

---

## 📦 Installazione

Il modo consigliato è **Docker**:

```bash
git clone https://github.com/useless-software/vivamed.git
```

```bash
cd vivamed
```

```bash
cp .env.example .env
```

Scegli una password in `POSTGRES_PASSWORD` dentro `.env`, poi:

```bash
docker compose up -d
```

Apri `http://localhost:3000` e crea l'account amministratore. Fatto!

- 📘 [Guida completa con Docker](docs/installazione-docker.md) — aggiornamenti, backup, impostazioni
- 📗 [Installazione manuale senza Docker](docs/installazione-manuale.md)

---

## 🧑‍💻 Sviluppo

vivamed è scritto in TypeScript con [Next.js](https://nextjs.org/) (App Router), [PostgreSQL](https://www.postgresql.org/) e [Prisma](https://www.prisma.io/).

Servono Node.js 22+ e un PostgreSQL raggiungibile. Copia `.env.example` in `.env`, imposta `DATABASE_URL` e poi:

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run dev
```

| Comando | Cosa fa |
|---|---|
| `npm run lint` | Controllo dello stile del codice |
| `npm run typecheck` | Controllo dei tipi TypeScript |
| `npm test` | Test unitari e di integrazione (serve il database) |
| `npm run test:e2e` | Test nel browser contro un vivamed avviato su un database vuoto |
| `npm run build` e `npm run start` | Build e avvio di produzione |

Dove trovare le cose:

- `src/app` — le pagine (`(auth)` per login e primo avvio, `(app)` per il gestionale)
- `src/server/actions` — le operazioni che modificano i dati, ognuna con il proprio controllo dei permessi
- `src/lib/permissions.ts` — chi può fare cosa
- `src/lib/messages.ts` — tutti i testi dell'interfaccia
- `prisma/` — schema del database e migrazioni
- `src/data/comuni.json` — comuni ISTAT (CC BY 4.0), aggiornabili con `node scripts/update-comuni.mjs`

Per vedere un tema delle feste in qualsiasi giorno aggiungi all'indirizzo `?festa=natale`
(oppure `halloween`, `capodanno`, `carnevale`, `san-valentino`, `pasqua`, `festa-repubblica`).

---

## 🗺️ Roadmap dei prossimi rilasci

Lavoriamo costantemente per arricchire vivamed. Ecco cosa abbiamo in programma:

- [ ] 📧 **Sistema Email Integrato:** Gestione completa delle comunicazioni verso utenti e pazienti.
- [ ] 💳 **Pagamenti con SumUp e Stripe:** Possibilità di far saldare le prestazioni inviando una semplice email al paziente dalla dashboard.
- [ ] 📤 **Import/Export Dati:** Esportazione ed importazione schede pazienti nei formati più diffusi (CSV, JSON, XML).
- [ ] 📬 **Mailing List e Newsletter:** Editor visivo WYSIWYG integrato per creare e inviare mail via SMTP/IMAP o tramite Brevo.
- [ ] ☁️ **S3 Storage Integrato:** Salvataggio sicuro in cloud di dati sensibili, referti e schede mediche.
- [ ] 🔌 **REST API per App Paziente:** API dedicate per integrare vivamed con app mobile terze o portali paziente.
- [ ] 🔒 **2FA e predisposizione per Internet** Autenticazione a 2 fattori sicura, e altri dettagli di sicurezza per permettere a vivamed di eseguire tranquillamente in una VPS senza troppi pensieri.

---

<div align="center">

Sviluppato con ❤️ per la community open source.

</div>
