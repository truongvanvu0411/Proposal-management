#!/bin/sh
set -eu

echo "[deploy] Waiting for PostgreSQL..."
node - <<'NODE'
const net = require('node:net');
const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 5432);
const deadline = Date.now() + 120000;

function wait() {
  const socket = net.createConnection({ host, port });
  socket.once('connect', () => {
    socket.end();
    process.exit(0);
  });
  socket.once('error', () => {
    socket.destroy();
    if (Date.now() > deadline) {
      console.error(`[deploy] PostgreSQL is not reachable at ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(wait, 2000);
  });
}

wait();
NODE

echo "[deploy] Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[deploy] Seeding demo data..."
  npm run db:seed
fi

echo "[deploy] Starting application..."
npx tsx server/src/main.ts
