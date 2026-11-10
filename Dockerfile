# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- dipendenze -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- strumenti per le migrazioni --------------------------------------------
# L'app in produzione non contiene la CLI di Prisma: la installiamo a parte,
# nella stessa versione usata dal progetto, per applicare le migrazioni all'avvio.
FROM base AS migrate
WORKDIR /migrate
COPY package.json /tmp/package.json
RUN npm init -y > /dev/null \
 && npm install --no-audit --no-fund \
      "prisma@$(node -p "require('/tmp/package.json').dependencies.prisma")" \
      "dotenv@$(node -p "require('/tmp/package.json').dependencies.dotenv")"
COPY prisma.config.ts ./
COPY prisma ./prisma

# ---- immagine finale --------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads

# Cartella dei documenti dei pazienti (in docker-compose è un volume).
RUN mkdir -p /app/uploads && chown node:node /app/uploads

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=migrate --chown=node:node /migrate ./migrate
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "./entrypoint.sh"]
