#!/bin/sh
set -eu

if [ ! -f .env.prod ]; then
  echo "Missing .env.prod. Copy .env.prod.example to .env.prod and fill secrets first."
  exit 1
fi

docker compose --env-file .env.prod -f docker-compose.prod.yml pull postgres minio minio-create-bucket caddy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

echo "[ok] Deployment started."
echo "Health check: curl -fsS https://$(grep '^APP_DOMAIN=' .env.prod | cut -d= -f2 | tr -d '\"')/api/health"
