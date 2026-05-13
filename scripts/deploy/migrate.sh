#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════╗"
echo "║  Database Migration                  ║"
echo "╚══════════════════════════════════════╝"

if [ -z "${POSTGRES_DB_URL:-}" ]; then
  echo "❌ POSTGRES_DB_URL is not set"
  exit 1
fi

echo "→ Running Drizzle migrations..."
pnpm --filter api drizzle-kit push

echo "→ Running seed check..."
# Check if base instrument exists; if not, run seeds
INSTRUMENT_COUNT=$(psql "$POSTGRES_DB_URL" -t -c "SELECT COUNT(*) FROM instruments;" 2>/dev/null || echo "0")
INSTRUMENT_COUNT=$(echo "$INSTRUMENT_COUNT" | tr -d '[:space:]')

if [ "$INSTRUMENT_COUNT" = "0" ]; then
  echo "  No instruments found — running initial seed..."
  pnpm --filter api seed
  echo "  ✅ Seeds applied"
else
  echo "  ✅ Data already exists — skipping seed ($INSTRUMENT_COUNT instruments found)"
fi

echo ""
echo "✅ Migration complete"
