# Installare vivamed con Docker (consigliato)

Con Docker bastano tre comandi: l'applicazione e il database partono già
configurati, e aggiornare o spostare vivamed su un altro computer è semplice.

## Cosa serve

- Un computer sempre acceso nella rete dello studio (il "server"): va bene anche
  un mini PC. Almeno 2 GB di RAM e 5 GB di disco liberi.
- [Docker](https://docs.docker.com/get-docker/) con Docker Compose:
  - **Linux**: Docker Engine (`curl -fsSL https://get.docker.com | sh`)
  - **Windows / macOS**: Docker Desktop
- [Git](https://git-scm.com/downloads), per scaricare vivamed.

## Installazione

1. Scarica vivamed:

   ```bash
   git clone https://github.com/useless-software/vivamed.git
   ```

   ```bash
   cd vivamed
   ```

2. Crea il file di configurazione:

   ```bash
   cp .env.example .env
   ```

   Apri `.env` e scegli una password per il database in `POSTGRES_PASSWORD`
   (lunga, solo lettere e numeri). Senza questa password vivamed non parte.

3. Avvia:

   ```bash
   docker compose up -d
   ```

   La prima volta servono alcuni minuti: Docker costruisce l'immagine.

4. Apri `http://localhost:3000` dal server, oppure
   `http://INDIRIZZO-DEL-SERVER:3000` dagli altri computer dello studio.
   Al primo accesso vivamed ti chiede di creare l'account amministratore.

Da qui in poi vivamed si riavvia da solo insieme al computer.

## Comandi utili

| Cosa vuoi fare | Comando |
|---|---|
| Vedere se è tutto acceso | `docker compose ps` |
| Leggere i messaggi dell'app | `docker compose logs -f app` |
| Fermare vivamed | `docker compose stop` |
| Riavviarlo | `docker compose up -d` |

## Aggiornare

```bash
git pull
```

```bash
docker compose up -d --build
```

Le modifiche al database vengono applicate automaticamente all'avvio.
**Fai sempre un backup prima di aggiornare.**

## Backup e ripristino

Tutti i dati stanno nel database. Per salvarli in un file:

```bash
docker compose exec -T db pg_dump -U vivamed -d vivamed --clean --if-exists > backup-vivamed.sql
```

Conserva il file **fuori dal server** (disco esterno, NAS…) e ricorda che
contiene dati sanitari: va protetto. Conviene pianificare il comando ogni notte
(cron su Linux, Utilità di pianificazione su Windows).

Per ripristinare un backup:

```bash
docker compose exec -T db psql -U vivamed -d vivamed < backup-vivamed.sql
```

> ⚠️ `docker compose down -v` cancella il volume con **tutti i dati**. Per fermare
> vivamed usa `docker compose stop` oppure `docker compose down` (senza `-v`).

## Impostazioni (`.env`)

| Variabile | A cosa serve | Predefinito |
|---|---|---|
| `POSTGRES_PASSWORD` | Password del database (obbligatoria) | — |
| `VIVAMED_PORT` | Porta su cui risponde vivamed | `3000` |
| `APP_TIMEZONE` | Fuso orario dello studio | `Europe/Rome` |
| `SESSION_HOURS` | Dopo quante ore si deve rifare il login | `12` |
| `COOKIE_SECURE` | `true` solo se vivamed è raggiunto in **https** | `false` |

Dopo ogni modifica: `docker compose up -d`.

## Sicurezza

- vivamed è pensato per la **rete interna** dello studio. Non esporlo
  direttamente su internet.
- Di base il traffico è in http: chi è collegato alla stessa rete potrebbe
  intercettarlo. Per cifrarlo metti davanti a vivamed un reverse proxy con
  https (ad esempio [Caddy](https://caddyserver.com/)) e imposta `COOKIE_SECURE=true`.
- Tieni aggiornati il sistema operativo del server e vivamed.

## Problemi comuni

- **"Imposta POSTGRES_PASSWORD nel file .env"** — manca la password nel file `.env`.
- **La porta 3000 è occupata** — cambia `VIVAMED_PORT` in `.env`, ad esempio `8080`.
- **Dopo il login torno alla pagina di accesso** — hai `COOKIE_SECURE=true` ma
  stai usando http: rimettilo a `false`.
- **Ho cambiato `POSTGRES_PASSWORD` e non parte più** — la password viene
  impostata solo alla prima creazione del database: rimetti quella originale.
