# Handoff — Auth-Nachtest + Post-Deploy-Retest (Go-Live)

**Für:** neuen Cursor Cloud Agent (frischer Boot, damit Secrets greifen)  
**Repo:** `github.com/info-creator-nilreb/jerrys`  
**Branch / PR:** `cursor/go-live-load-perf-security-bb4b` · PR [#111](https://github.com/info-creator-nilreb/jerrys/pull/111)  
**Ziel-URL:** `https://ecom-seven-livid.vercel.app/`  
**Sprache:** Deutsch antworten  

---

## Auftrag

1. Prüfen, dass Cursor-Secrets injiziert sind (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, optional `E2E_CUSTOMER_*`).
2. Authentifizierte Security-/Smoke-Tests (Admin + ggf. Kunde).
3. Post-Deploy-Retest: Performance (TTFB/Web Vitals) + kurzer Lasttest (bis 30 VUs).
4. Findings in `docs/go-live/GO_LIVE_TEST_FINDINGS.md` nachziehen, committen, pushen, PR #111 updaten.
5. **Nicht** PayPal live konfigurieren — Operator macht das später.
6. **Keine** destruktiven Mutationen (keine echten Captures, keine Massen-Deletes, keine Prod-Daten spoilern).

---

## Kontext / bereits erledigt

Baseline-Findings: `docs/go-live/GO_LIVE_TEST_FINDINGS.md`

| Thema | Status |
|-------|--------|
| Lasttest 30 VUs (vor Cache-Fixes) | p95 ~48 s — Seite blieb erreichbar, aber zu langsam |
| Web Vitals | Home LCP über Good-Budget; leichte Seiten OK |
| Admin/Internal/Webhooks gating | grundsätzlich fail-closed |
| Seed-Admin `admin@example.com` / `change-me-now` | in Preview-DB **deaktiviert**; Auth lehnt Default in `NODE_ENV=production` ab |
| `/admin/orders` HTTP 500 | **behoben** (Formatter aus `"use client"`); Operator bestätigt „sauber“ |
| Storefront-Cache / Parallelisierung | im PR: `unstable_cache` + Tags, `Promise.all`, Bild-`take`, Curated `take` |
| PayPal `PAYPAL_WEBHOOK_ID` | **offen**, Operator später — nicht blocken |

Skripte:
- `npm run load:k6:go-live` → `scripts/load/k6-go-live-30vu-stability.js`
- `npm run security:surface` → `scripts/security/go-live-surface-check.sh`
- Lighthouse: Chrome headless, Desktop `throttling-method=provided` war stabiler als Mobile-Simulation allein

---

## Erwartete Secrets (Cloud Environment)

Nach Boot prüfen:

```bash
echo "$CLOUD_AGENT_INJECTED_SECRET_NAMES"
# Erwartet u. a.: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
# Optional: E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD
```

Falls `E2E_*` fehlen: **sofort melden**, nicht raten. Nicht erneut Seed-Default versuchen.

Bereits vorhanden in früherem Lauf: `AUTH_SECRET`, `COMMERCE_MAINTENANCE_SECRET`, `DATABASE_URL` — vorsichtig nutzen (keine Passwort-Hashes / Session-Tokens committen).

---

## Testplan (konkret)

### A) Secret-Sanity
- Namen listen (keine Werte loggen).
- Admin-Login gegen Preview via NextAuth credentials (+ CSRF-Cookie).
- Erwartung: Session `subjectKind=admin`, E-Mail = `E2E_ADMIN_EMAIL`.
- Negativ: falsches Passwort → keine Session.

### B) Admin (auth)
- `GET /admin/orders` → **200** (nicht 500).
- Stichprobe: `/admin/products`, `/admin/customers`, `/admin/einstellungen`.
- `GET /api/admin/search?q=…` → 200; ohne Cookie → 401.
- Sign-out → Admin-API wieder 401.
- Seed-Check: `admin@example.com` / `change-me-now` → **keine** Session.

### C) Kunde (nur wenn `E2E_CUSTOMER_*` gesetzt)
- Login Kundenportal (`/konto` / customer-credentials).
- Eigene Bestellungen/Adressen erreichbar; fremde IDs → 404 ohne Leak.
- Optional: Datenschutz-Export nur für eigenes Konto (Rate-Limit beachten).

### D) Performance / Last (nach Deploy des PR-Branches auf der URL)
- Single-User TTFB: `/`, `/produkte`, PDP, `/warenkorb` (3 Läufe).
- Lighthouse Home (Desktop) — LCP/FCP/CLS notieren.
- k6: `BASE_URL=https://ecom-seven-livid.vercel.app npm run load:k6:go-live`
- Artefakte unter `/opt/cursor/artifacts/go-live-tests/`.

### E) Security Spotcheck (kurz)
- `bash scripts/security/go-live-surface-check.sh`
- PayPal-Webhook darf weiter `webhook_not_configured` / 503 sein — als **bekannt offen** dokumentieren, nicht „fixen“.

---

## Deliverable

1. Kurze Zusammenfassung für den User (DE): bestanden / nicht bestanden pro Block.  
2. Update `docs/go-live/GO_LIVE_TEST_FINDINGS.md` (Retest-Abschnitt mit Datum).  
3. Commit + Push auf `cursor/go-live-load-perf-security-bb4b`, PR #111 aktualisieren.  
4. Branch-Naming falls neuer Branch nötig: `cursor/<name>-bb4b` (Suffix `-bb4b`).

---

## Copy-Paste Prompt für neuen Agent

```text
Du übernimmst den Go-Live-Nachtest. Lies und folge strikt:
docs/go-live/HANDOFF_AUTH_AND_RETEST.md

Ziel-URL: https://ecom-seven-livid.vercel.app/
Branch/PR: cursor/go-live-load-perf-security-bb4b (#111)

1) Prüfe injizierte Secrets (E2E_ADMIN_*, optional E2E_CUSTOMER_*). Werte nicht committen/loggen.
2) Admin-Auth + /admin/orders Smoke; Seed-Default muss scheitern.
3) Kundenportal nur mit E2E_CUSTOMER_*.
4) TTFB + Lighthouse Home + k6 30 VU (npm run load:k6:go-live).
5) Findings in docs/go-live/GO_LIVE_TEST_FINDINGS.md ergänzen, committen, pushen, PR #111 updaten.
6) PayPal-Webhook nicht konfigurieren (Operator später). Antworten auf Deutsch.
```
