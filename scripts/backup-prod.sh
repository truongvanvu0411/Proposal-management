#!/bin/sh
set -eu

if [ ! -f .env.prod ]; then
  echo "Missing .env.prod."
  exit 1
fi

. ./.env.prod

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[backup] Dumping PostgreSQL..."
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/postgres-$STAMP.sql"

echo "[backup] Archiving MinIO volume..."
docker run --rm \
  -v proposal-management_minio_data:/data:ro \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/minio-$STAMP.tgz" -C /data .

echo "[ok] Backup written to $BACKUP_DIR"
