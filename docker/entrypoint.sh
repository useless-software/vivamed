#!/bin/sh
# Avvio del container: prima aggiorna lo schema del database, poi lancia vivamed.
set -e

echo "vivamed: applico le migrazioni del database..."
(cd /app/migrate && node node_modules/prisma/build/index.js migrate deploy)

echo "vivamed: avvio dell'applicazione sulla porta ${PORT:-3000}"
exec node /app/server.js
