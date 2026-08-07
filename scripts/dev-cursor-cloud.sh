#!/usr/bin/env bash
# Cursor Cloud Agent: Dev-Server für Port-Forwarding (Stecker → 3001 → Globus).
# AUTH_URL muss http://localhost:<PORT> sein — nicht trycloudflare, solange du localhost nutzt.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3001}"
BASE="http://localhost:${PORT}"

export AUTH_URL="${AUTH_URL:-$BASE}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$AUTH_URL}"

echo "→ Cursor Cloud Dev: ${BASE} (AUTH_URL=${AUTH_URL})"
echo "  Ports → 3001 → Globus. Browser: ${BASE} (http). Bei fehlendem Next-„N“: externen Tab nutzen."

exec npx next dev --webpack -H 0.0.0.0 -p "${PORT}"
