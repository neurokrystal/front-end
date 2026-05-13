#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-https://your-api-url.ondigitalocean.app}"
WEB_URL="${2:-https://your-web-url.ondigitalocean.app}"

echo "╔══════════════════════════════════════╗"
echo "║  Post-Deployment Smoke Test          ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "API: $API_URL"
echo "Web: $WEB_URL"
echo ""

ERRORS=0

# 1. API health
echo "→ API health check..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo "  ✅ API is healthy"
  # Show details
  curl -s "$API_URL/health" | python3 -m json.tool 2>/dev/null || true
else
  echo "  ❌ API health check failed (HTTP $HEALTH)"
  ERRORS=$((ERRORS + 1))
fi

# 2. PDF health
echo ""
echo "→ PDF generation health check..."
PDF_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/pdf" 2>/dev/null || echo "000")
if [ "$PDF_HEALTH" = "200" ]; then
  echo "  ✅ PDF generation is operational"
  curl -s "$API_URL/health/pdf" | python3 -m json.tool 2>/dev/null || true
else
  echo "  ❌ PDF generation health check failed (HTTP $PDF_HEALTH)"
  echo "  This likely means Chromium is not installed or not accessible."
  echo "  Check that PUPPETEER_EXECUTABLE_PATH is set and the binary exists."
  ERRORS=$((ERRORS + 1))
fi

# 3. Web health
echo ""
echo "→ Web health check..."
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null || echo "000")
if [ "$WEB_HEALTH" = "200" ]; then
  echo "  ✅ Web is serving"
else
  echo "  ❌ Web health check failed (HTTP $WEB_HEALTH)"
  ERRORS=$((ERRORS + 1))
fi

# 4. API responds to instrument request
echo ""
echo "→ API instrument endpoint..."
INSTRUMENT_RESP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/instruments/base-diagnostic" 2>/dev/null || echo "000")
if [ "$INSTRUMENT_RESP" = "200" ] || [ "$INSTRUMENT_RESP" = "401" ]; then
  echo "  ✅ Instrument endpoint responds ($INSTRUMENT_RESP)"
else
  echo "  ❌ Instrument endpoint failed (HTTP $INSTRUMENT_RESP)"
  ERRORS=$((ERRORS + 1))
fi

# 5. Database connectivity (via health endpoint)
echo ""
echo "→ Database connectivity..."
DB_STATUS=$(curl -s "$API_URL/health" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('database','unknown'))" 2>/dev/null || echo "unknown")
if [ "$DB_STATUS" = "connected" ]; then
  echo "  ✅ Database connected"
else
  echo "  ❌ Database status: $DB_STATUS"
  ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "  ✅ All smoke tests passed"
else
  echo "  ❌ $ERRORS smoke test(s) failed"
  exit 1
fi
echo "════════════════════════════════════════"
