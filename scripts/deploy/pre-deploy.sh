#!/usr/bin/env bash
set -euo pipefail

echo "╔══════════════════════════════════════╗"
echo "║  Pre-Deployment Validation           ║"
echo "╚══════════════════════════════════════╝"

ERRORS=0

# 1. Check TypeScript compiles
echo ""
echo "→ Checking TypeScript compilation..."
if pnpm --filter @dimensional/shared build 2>/dev/null; then
  echo "  ✅ Shared library builds"
else
  echo "  ❌ Shared library build FAILED"
  ERRORS=$((ERRORS + 1))
fi

if pnpm --filter api typecheck 2>/dev/null; then
  echo "  ✅ API typechecks"
else
  echo "  ❌ API typecheck FAILED"
  ERRORS=$((ERRORS + 1))
fi

if pnpm --filter web typecheck 2>/dev/null; then
  echo "  ✅ Web typechecks"
else
  echo "  ❌ Web typecheck FAILED"
  ERRORS=$((ERRORS + 1))
fi

# 2. Check for pending migrations
echo ""
echo "→ Checking for pending migrations..."
MIGRATION_OUTPUT=$(pnpm --filter api drizzle-kit generate 2>&1 || true)
if echo "$MIGRATION_OUTPUT" | grep -q "No schema changes"; then
  echo "  ✅ No pending migrations"
else
  echo "  ⚠️  Pending migrations detected — run drizzle-kit push before deploying"
  echo "     $MIGRATION_OUTPUT"
fi

# 3. Check Docker builds
echo ""
echo "→ Checking Docker build (API)..."
if docker build -f apps/api/Dockerfile -t dimensional-api-check . --quiet 2>/dev/null; then
  echo "  ✅ API Docker image builds"
  docker rmi dimensional-api-check --force 2>/dev/null || true
else
  echo "  ❌ API Docker build FAILED"
  ERRORS=$((ERRORS + 1))
fi

echo "→ Checking Docker build (Web)..."
if docker build -f apps/web/Dockerfile -t dimensional-web-check . --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 --quiet 2>/dev/null; then
  echo "  ✅ Web Docker image builds"
  docker rmi dimensional-web-check --force 2>/dev/null || true
else
  echo "  ❌ Web Docker build FAILED"
  ERRORS=$((ERRORS + 1))
fi

# 4. Check required env vars documentation
echo ""
echo "→ Checking environment variable documentation..."
REQUIRED_VARS=("POSTGRES_DB_URL" "BETTER_AUTH_SECRET" "BETTER_AUTH_URL")
OPTIONAL_VARS=("STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET" "DO_SPACES_KEY" "DO_SPACES_SECRET" "DO_SPACES_BUCKET" "DO_SPACES_ENDPOINT")

echo "  Required:"
for var in "${REQUIRED_VARS[@]}"; do
  echo "    - $var"
done
echo "  Optional (features degrade gracefully without these):"
for var in "${OPTIONAL_VARS[@]}"; do
  echo "    - $var"
done

# 5. Run tests
echo ""
echo "→ Running tests..."
if pnpm --filter api test 2>/dev/null; then
  echo "  ✅ API tests pass"
else
  echo "  ❌ API tests FAILED"
  ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "  ✅ All checks passed — safe to deploy"
else
  echo "  ❌ $ERRORS check(s) failed — DO NOT DEPLOY"
  exit 1
fi
echo "════════════════════════════════════════"
