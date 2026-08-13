#!/usr/bin/env bash
# Best-practice Security Surface Check gegen eigene Architektur (keine Drittanbieter-Angriffe).
set -euo pipefail

BASE="${BASE_URL:-https://ecom-seven-livid.vercel.app}"
OUT="${1:-/opt/cursor/artifacts/go-live-tests/security-surface.txt}"
mkdir -p "$(dirname "$OUT")"
: >"$OUT"

log() { echo "$@" | tee -a "$OUT"; }

log "=== Security Surface Check ==="
log "Target: $BASE"
log "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log ""

check() {
  local name="$1" expect="$2" url="$3"
  shift 3
  local code bodyfile
  bodyfile=$(mktemp)
  code=$(curl -sS -o "$bodyfile" -w "%{http_code}" "$@" "$url" || echo "000")
  local snippet
  snippet=$(head -c 160 "$bodyfile" | tr '\n' ' ')
  local pass="FAIL"
  if [[ "$code" == "$expect" ]] || [[ "$expect" == *"|"* && "$code" =~ ^(${expect})$ ]]; then
    pass="PASS"
  fi
  # expect can be regex like 401|403
  if [[ "$expect" == *"|"* ]]; then
    if echo "$code" | grep -Eq "^(${expect})$"; then pass="PASS"; else pass="FAIL"; fi
  else
    if [[ "$code" == "$expect" ]]; then pass="PASS"; else pass="FAIL"; fi
  fi
  log "[$pass] $name → HTTP $code (erwartet $expect) — $snippet"
  rm -f "$bodyfile"
}

log "## Auth / Admin gating"
admin_code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/admin")
if [[ "$admin_code" == "307" || "$admin_code" == "302" ]]; then
  log "[PASS] GET /admin ohne Session → Redirect → HTTP $admin_code (erwartet 307|302)"
else
  log "[FAIL] GET /admin ohne Session → Redirect → HTTP $admin_code (erwartet 307|302)"
fi
check "GET /api/admin/search ohne Session" "401" "$BASE/api/admin/search?q=test"
check "GET /api/admin/order-alerts ohne Session" "401" "$BASE/api/admin/order-alerts?since=2020-01-01T00:00:00.000Z"
check "GET /api/admin/orders/fake/invoice" "401" "$BASE/api/admin/orders/clxxxxxxxxxxxxxxxxxxxxxxxx/invoice"
check "GET /admin/login erreichbar" "200" "$BASE/admin/login"

log ""
log "## Internal / Cron fail-closed"
check "GET /api/internal/commerce-maintenance ohne Secret" "401" "$BASE/api/internal/commerce-maintenance"
check "POST /api/internal/commerce-maintenance fake Bearer" "401" "$BASE/api/internal/commerce-maintenance" \
  -X POST -H "Authorization: Bearer definitely-not-the-secret" -H "Content-Type: application/json" -d '{}'

log ""
log "## Webhooks: unsigniert ablehnen (kein 5xx)"
check "POST /api/webhooks/paypal ohne Signatur" "400|401|503" "$BASE/api/webhooks/paypal" \
  -X POST -H "Content-Type: application/json" -d '{}'
check "POST /api/webhooks/zettle ohne Signatur" "401|400|403" "$BASE/api/webhooks/zettle" \
  -X POST -H "Content-Type: application/json" -d '{"eventName":"PurchaseCreated"}'
check "POST /api/webhooks/zettle TestMessage" "200" "$BASE/api/webhooks/zettle" \
  -X POST -H "Content-Type: application/json" -d '{"eventName":"TestMessage"}'

log ""
log "## Öffentliche Storefront-APIs (erwartet kontrolliert)"
check "GET product-suggest kurz" "200|400" "$BASE/api/storefront/product-suggest?q=a"
check "GET product-suggest ok" "200" "$BASE/api/storefront/product-suggest?q=katze"
check "GET address-suggest" "200|400" "$BASE/api/storefront/address-suggest?land=DE&plz=80331"
check "GET katalog.json" "200" "$BASE/katalog.json"
check "GET /llms.txt" "200" "$BASE/llms.txt"

log ""
log "## Checkout APIs ohne Cart (kontrollierte Fehler, kein 5xx)"
check "POST paypal create-order leer" "400|401|403|422|429" "$BASE/api/checkout/paypal/create-order" \
  -X POST -H "Content-Type: application/json" -d '{}'
check "POST paypal capture-order leer" "400|401|403|422|429" "$BASE/api/checkout/paypal/capture-order" \
  -X POST -H "Content-Type: application/json" -d '{}'
check "POST workshop start-checkout leer" "400|404|422|303|302" "$BASE/api/workshop/start-checkout" \
  -X POST -H "Content-Type: application/x-www-form-urlencoded" -d 'sessionId=&seatCount=1'

log ""
log "## Security Headers (Homepage)"
headers=$(curl -sSI "$BASE/" | tr -d '\r')
for h in "strict-transport-security" "content-security-policy" "x-frame-options" "referrer-policy" "permissions-policy"; do
  if echo "$headers" | grep -qi "^${h}:"; then
    log "[PASS] Header vorhanden: $h — $(echo "$headers" | grep -i "^${h}:" | head -1)"
  else
    log "[FAIL] Header fehlt: $h"
  fi
done

if echo "$headers" | grep -qi "access-control-allow-origin: \*"; then
  log "[FAIL] Offenes CORS *"
else
  log "[PASS] Kein Access-Control-Allow-Origin: *"
fi

if echo "$headers" | grep -qi "x-powered-by"; then
  log "[INFO] x-powered-by gesetzt (Informationsleak gering) — $(echo "$headers" | grep -i '^x-powered-by:' | head -1)"
else
  log "[PASS] x-powered-by nicht gesetzt"
fi

log ""
log "## Sensitive path probes (Info Disclosure)"
for p in /.env /.git/HEAD /api/auth/session /package.json /prisma/schema.prisma; do
  code=$(curl -sS -o /tmp/probe_body -w "%{http_code}" "$BASE$p" || echo 000)
  size=$(wc -c </tmp/probe_body)
  log "[INFO] $p → $code (${size}b)"
done

log ""
log "## Rate-Limit Spotcheck product-suggest (burst)"
rl_429=0
rl_ok=0
for i in $(seq 1 40); do
  c=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/storefront/product-suggest?q=test$i")
  if [[ "$c" == "429" ]]; then rl_429=$((rl_429+1)); elif [[ "$c" == "200" ]]; then rl_ok=$((rl_ok+1)); fi
done
log "[INFO] product-suggest burst 40: 200=$rl_ok 429=$rl_429 (andere Codes möglich)"
if [[ "$rl_429" -gt 0 ]]; then
  log "[PASS] Rate-Limit greift unter Burst"
else
  log "[WARN] Kein 429 im Burst — In-Memory-Limit ggf. pro Instanz / Threshold höher"
fi

log ""
log "=== Ende Security Surface Check ==="
log "Report: $OUT"
