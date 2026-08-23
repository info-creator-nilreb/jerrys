#!/usr/bin/env bash
# Wendet prisma migrate deploy auf alle gesetzten PRISMA_MIGRATE_DATABASE_URL_* aus.
# Nutzung (lokal):
#   export PRISMA_MIGRATE_DATABASE_URL_JERRYS="postgresql://…5432…"
#   export PRISMA_MIGRATE_DATABASE_URL_EDELWEISS="postgresql://…5432…"
#   bash scripts/migrate-all-shops.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

shops=(
  "jerry's|PRISMA_MIGRATE_DATABASE_URL_JERRYS"
  "Edelweiss|PRISMA_MIGRATE_DATABASE_URL_EDELWEISS"
)

ran=0
for entry in "${shops[@]}"; do
  label="${entry%%|*}"
  var="${entry##*|}"
  url="${!var:-}"
  if [ -z "$url" ]; then
    echo "⏭  $label — \$$var nicht gesetzt, übersprungen"
    continue
  fi
  echo "▶  $label — prisma migrate deploy"
  PRISMA_MIGRATE_DATABASE_URL="$url" npx prisma migrate deploy
  ran=$((ran + 1))
done

if [ "$ran" -eq 0 ]; then
  echo "Keine Migrate-URL gesetzt. Beispiel:"
  echo '  PRISMA_MIGRATE_DATABASE_URL_JERRYS="postgresql://…" bash scripts/migrate-all-shops.sh'
  exit 1
fi

echo "✓ $ran Shop(s) migriert."
