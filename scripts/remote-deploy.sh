#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/apps/cofound-backend}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
GIT_REF="${GIT_REF:-main}"

if [ ! -d "$APP_DIR" ]; then
  echo "Target directory '$APP_DIR' does not exist. Set APP_DIR to your deployed repository." >&2
  exit 1
fi

cd "$APP_DIR"

echo "Fetching latest changes..."
git fetch origin

echo "Checking out $GIT_REF"
git checkout "$GIT_REF"
git reset --hard "origin/$GIT_REF"

# Ajouter la génération Prisma Client
echo "Installing dependencies and generating Prisma Client..."
pnpm install --frozen-lockfile
pnpm --filter api prisma generate

echo "Rebuilding services with $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" pull

docker compose -f "$COMPOSE_FILE" run --rm api pnpm --filter @cofound/api prisma migrate deploy

docker compose -f "$COMPOSE_FILE" up -d --build

echo "Cleaning unused images"
docker image prune -f >/dev/null 2>&1 || true

echo "Deployment complete."
