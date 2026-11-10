# Installare vivamed senza Docker

Questa strada è per chi non può o non vuole usare Docker. Richiede un po' più
di dimestichezza: devi installare e mantenere tu Node.js e PostgreSQL.
Se puoi scegliere, la [guida Docker](installazione-docker.md) è più semplice.

Gli esempi sono per Linux (Debian/Ubuntu); su Windows e macOS i passi sono gli
stessi, cambiano solo i comandi per installare i programmi.

## Cosa serve

- [Node.js](https://nodejs.org/) 22 o successivo
- [PostgreSQL](https://www.postgresql.org/download/) 14 o successivo
- [Git](https://git-scm.com/downloads)

## 1. Prepara il database

```bash
sudo -u postgres psql -c "CREATE USER vivamed WITH PASSWORD 'SCEGLI-UNA-PASSWORD'"
```

```bash
sudo -u postgres psql -c "CREATE DATABASE vivamed OWNER vivamed"
```

vivamed usa l'estensione `btree_gist` di PostgreSQL per impedire gli
appuntamenti sovrapposti. Di norma viene attivata da sola; se al passo 3 compare
un errore di permessi su `btree_gist`, attivala a mano e riprova:

```bash
sudo -u postgres psql -d vivamed -c "CREATE EXTENSION IF NOT EXISTS btree_gist"
```

## 2. Scarica e configura vivamed

```bash
git clone https://github.com/useless-software/vivamed.git
```

```bash
cd vivamed
```

```bash
cp .env.example .env
```

Apri `.env` e metti in `DATABASE_URL` la password scelta al passo 1:

```
DATABASE_URL="postgresql://vivamed:SCEGLI-UNA-PASSWORD@localhost:5432/vivamed?schema=public"
```

(`POSTGRES_PASSWORD` e `VIVAMED_PORT` servono solo con Docker: ignorali.)

## 3. Installa, crea le tabelle e compila

```bash
npm ci
```

```bash
npm run db:migrate
```

```bash
npm run build
```

## 4. Avvia

```bash
npm run start
```

Apri `http://localhost:3000` (o `http://INDIRIZZO-DEL-SERVER:3000` dagli altri
computer). Al primo accesso crei l'account amministratore.

Per usare un'altra porta: `PORT=8080 npm run start`.

## 5. Avvio automatico (Linux, systemd)

Crea `/etc/systemd/system/vivamed.service` adattando utente e cartella:

```ini
[Unit]
Description=vivamed
After=network.target postgresql.service

[Service]
Type=simple
User=vivamed
WorkingDirectory=/opt/vivamed
ExecStart=/usr/bin/npm run start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now vivamed
```

Su Windows puoi ottenere lo stesso risultato con [NSSM](https://nssm.cc/) o con
l'Utilità di pianificazione.

## Aggiornare

**Prima fai un backup**, poi ferma vivamed ed esegui:

```bash
git pull
```

```bash
npm ci
```

```bash
npm run db:migrate
```

```bash
npm run build
```

Infine riavvia vivamed (`sudo systemctl restart vivamed`).

## Backup e ripristino

```bash
pg_dump "postgresql://vivamed:SCEGLI-UNA-PASSWORD@localhost:5432/vivamed" --clean --if-exists > backup-vivamed.sql
```

```bash
psql "postgresql://vivamed:SCEGLI-UNA-PASSWORD@localhost:5432/vivamed" < backup-vivamed.sql
```

Salva anche la cartella dei documenti dei pazienti (`UPLOAD_DIR`, predefinita
`uploads` dentro la cartella di vivamed), ad esempio:

```bash
tar -czf backup-documenti.tar.gz -C /opt/vivamed/uploads .
```

Conserva i backup fuori dal server e proteggili: contengono dati sanitari.

## Impostazioni e sicurezza

Le impostazioni di `.env` (`APP_TIMEZONE`, `SESSION_HOURS`, `COOKIE_SECURE`,
`UPLOAD_DIR`, `MAX_UPLOAD_MB`) e
le raccomandazioni di sicurezza sono le stesse della
[guida Docker](installazione-docker.md#impostazioni-env). Dopo una modifica a
`.env` basta riavviare vivamed.
