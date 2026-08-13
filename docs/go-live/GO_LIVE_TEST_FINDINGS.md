# Go-Live Test Findings

**Ziel:** `https://ecom-seven-livid.vercel.app/`  
**Datum:** 2026-08-13 (UTC)  
**Scope:** Lasttest (bis 30 parallele Nutzer), Performance (Web Vitals / Lighthouse), Security Surface (eigene Architektur, keine Drittanbieter-Angriffe)  
**Auth-Hinweis:** Cloud-Agent-Secrets enthalten weiterhin **keine** `E2E_ADMIN_*` / `E2E_CUSTOMER_*` (nur `AUTH_SECRET`, `COMMERCE_MAINTENANCE_SECRET`, `DATABASE_URL`) — bestätigt im frischen Boot §7. Baseline nutzte noch Seed-Admin (SEC-09); Retests §6/§7: Seed-Default liefert **keine** Session. Authentifizierte Admin-/Kunden-Smokes bleiben blockiert.

---

## Gesamturteil

| Test | Ergebnis | Kurzfazit |
|------|----------|-----------|
| Lasttest (30 VUs) | **Nicht bestanden** | Keine 5xx-Welle, aber Antwortzeiten unter Last unakzeptabel (p95 ~48 s). |
| Performance / Web Vitals | **Teilweise** | Leichtere Seiten OK; Startseite/PDP mit LCP über „Good“-Budget. |
| Security Surface | **Grundsätzlich solide, mit Go-Live-Blockern** | Admin/Internal/Webhooks fail-closed; **PayPal-Webhook nicht konfiguriert**; **Seed-Admin-Passwort noch aktiv**; `/admin/orders` → HTTP 500; Rate-Limits auf Serverless schwach. |

**Empfehlung vor Livegang:** Zuerst Server-/DB-Latenz und Caching der schweren SSR-Seiten adressieren sowie `PAYPAL_WEBHOOK_ID` (und Live-Webhook-URL) setzen. Danach Lasttest wiederholen.

---

## 1. Lasttest

### Setup

- Tool: k6 v2.2.0  
- Skripte: `scripts/load/k6-go-live-30vu.js`, `scripts/load/k6-go-live-30vu-stability.js`  
- Ramp: bis **30 VUs**, Lesepfade Storefront (+ erste Variante inkl. Admin-Gating-Probes)  
- Artefakte: `/opt/cursor/artifacts/go-live-tests/k6-*.txt|json`

### Ergebnisse (Stabilitätslauf, nur 200-er Lesepfade)

| Metrik | Wert | Ziel |
|--------|------|------|
| HTTP-Fehlerquote | **0 %** | &lt; 1 % |
| p95 `http_req_duration` | **~48 s** | &lt; 5 s |
| Requests &lt; 10 s | **~8 %** | möglichst &gt; 95 % |
| Iterationen bei 30 VUs | 125 in ~2,5 min | — |

Zusätzlicher Burst mit `curl` (30 parallele `GET /`): alle **HTTP 200**, total avg **~10,9 s**, p95 **~16,7 s**.

### Single-User Baseline (curl TTFB, 3 Läufe)

| Pfad | typ. TTFB |
|------|-----------|
| `/` | **2,3–3,7 s** |
| `/produkte` | ~1,2 s |
| `/produkte/design-katzenhoehle` | ~1,8–1,9 s |
| `/termine` | ~1,0–1,4 s |
| `/warenkorb` | ~0,45 s |
| `/admin/login` | ~60 ms |

### Bewertung

- **Stabilität:** Die Anwendung bleibt unter 30 parallelen Clients erreichbar (keine flächendeckenden Fehler).  
- **Geschwindigkeit:** Nicht go-live-tauglich für „zügig“ bei 30 Nutzern. Engpass wirkt wie **SSR + Backend/DB / Serverless-Concurrency**, nicht wie reine Asset-Auslieferung (`/admin/login` und APIs wie product-suggest bleiben relativ schnell).  
- Erster k6-Lauf mit Admin-Probes zeigte zusätzlich ~8 % `http_req_failed` — das waren erwartete **401/307** (Messartefakt), nicht App-Abstürze.

### Maßnahmen (Priorität)

1. **P0:** Startseite und Katalog-SSR profilen (DB-Queries, Sequenz vs. Parallel, Payload).  
2. **P0:** Caching/`unstable_cache`/ISR bzw. Partial Prerender wo fachlich möglich; schwere Blöcke streamen.  
3. **P1:** Vercel-Function-/Region-/DB-Pooler-Limits prüfen (Cold Start, Connection Pool).  
4. **P1:** Lasttest nach Fix erneut mit `scripts/load/k6-go-live-30vu-stability.js`.

---

## 2. Performance / Web Vitals

### Methode

- Lighthouse 12 (Chrome headless)  
- Desktop ohne zusätzliches Netz-Throttling (`throttling-method=provided`) sowie Mobile (simuliert) für Home  
- Budgets (Google „Good“): LCP ≤ 2,5 s · INP/TBT niedrig · CLS ≤ 0,1 · TTFB ideal &lt; 0,8 s (Server)

> Hinweis: Lighthouse meldete `server-response-time` teils unrealistisch (~ms). **Maßgeblich für TTFB sind die curl-Messungen** oben.

### Lighthouse Scores (Auszug)

| Seite | Form Factor | Perf. | LCP | FCP | CLS | Anmerkung |
|-------|-------------|------:|----:|----:|----:|-----------|
| `/` | Desktop | 61 | **3776 ms** | 3658 ms | 0 | unter Budget |
| `/` | Mobile | 91 | **3090 ms** | 972 ms | 0 | LCP Needs Improvement |
| `/produkte` | Desktop | 76 | 1763 ms | 1763 ms | **0,165** | CLS über 0,1 |
| PDP Katzenhöhle | Desktop | 75 | ~2250 ms | ~2250 ms | 0 | knapp am Budget |
| `/termine` | Desktop | 90 | 1483 ms | 1394 ms | 0 | OK |
| `/warenkorb` | Desktop | 100 | 595 ms | 508 ms | 0 | gut |
| `/admin/login` | Desktop | 100 | 176 ms | 176 ms | 0 | gut |

HTML-Report: `lighthouse/home.report.html` (Artifacts).

### Bewertung

- **Adäquat** für leichte Seiten (Warenkorb, Admin-Login, Termine).  
- **Nicht adäquat** für die Startseite (LCP &gt; 2,5 s Desktop/Mobile) und kritisch in Kombination mit dem Lastverhalten.  
- `/produkte` hat spürbares **CLS** — Layout-Shift vor Livegang beheben (Bilder/Platzhalter/Fonts).

---

## 3. Security Check (eigene Architektur)

### Methode

- Live-Probes: `scripts/security/go-live-surface-check.sh` + manuelle Deep-Probes  
- Code-Review der API-Oberfläche (`docs/SECURITY_SURFACE.md` + Route-Handler)  
- Keine Angriffe gegen PayPal/Zettle/Supabase selbst; keine destruktiven Mutationen

### Bestanden

| Kontrolle | Ergebnis |
|-----------|----------|
| `/admin` ohne Session | Redirect → `/admin/login` |
| `/api/admin/*` ohne Session | **401** |
| `/api/internal/commerce-maintenance` ohne/falsches Secret | **401** (fail-closed) |
| PayPal-Webhook ohne Signatur/Config | **503** `webhook_not_configured` (kein 5xx-Storm) |
| Zettle-Webhook ohne Signatur | **401** `invalid_signature` |
| Security Headers | HSTS, CSP, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy |
| CORS | kein `Access-Control-Allow-Origin: *` |
| Sensitive Paths `/.env`, `/.git`, `/package.json` | **404** (kein Leak) |
| Checkout-APIs ohne gültige Eingaben | kontrollierte **400** |
| `robots.txt` | `/admin/`, `/api/` disallow |

### Findings

| ID | Schwere | Finding | Empfehlung |
|----|---------|---------|------------|
| SEC-01 | **Hoch (Go-Live)** | `PAYPAL_WEBHOOK_ID` auf dieser Umgebung **nicht gesetzt** → Webhooks liefern 503. Return-URL allein ist schwächer (Race/Lost-Redirect). | Vor Live: Webhook-URL + ID in PayPal + Env setzen; Capture/Refund-Events smoke-testen. |
| SEC-09 | **Kritisch → Retest behoben** | Baseline: Seed-Admin `admin@example.com` / `change-me-now` war gültig. **Retest 13:51 UTC:** Login liefert **keine** Session (DB deaktiviert + Production lehnt insecure Default ab). | Verifiziert; `E2E_ADMIN_*` für positive Admin-Logins setzen. |
| SEC-10 | **Hoch (Funktional) → Code-Fix im PR, auth-Verify offen** | Baseline: `GET /admin/orders` → **HTTP 500**. Fix im Branch (Formatter aus `"use client"`). **Retest:** authentifizierter 200-Check **nicht** möglich (keine `E2E_ADMIN_*`). | Nach Secret-Injection `/admin/orders` erneut auf 200 prüfen. |
| SEC-02 | Mittel | Rate-Limits sind **in-memory pro Instanz**. Burst 40× `product-suggest` → **0× 429**. | Shared Store (Redis/Upstash) oder Edge/WAF-Rate-Limit für öffentliche APIs. |
| SEC-03 | Mittel | `/api/workshop/start-checkout` & `complete-checkout` **ohne Rate-Limit** (Hold-/Spam-Fläche). | IP-Rate-Limit analog Checkout; ungültige `sessionId` hart 4xx ohne teure Side-Effects. |
| SEC-04 | Niedrig | CSP erlaubt `'unsafe-inline'` und `'unsafe-eval'` (PayPal/Next-Kompromiss). | Langfristig Nonces/Hashes; Eval vermeiden wo möglich. |
| SEC-05 | Niedrig | `x-powered-by: Next.js` gesetzt. | In `next.config` deaktivieren. |
| SEC-06 | Niedrig | `llms.txt` / `robots.txt` Sitemap zeigen **andere Vercel-Host**-URLs (`ecom-ka2en0bh2-…`) statt kanonischer Domain. | `NEXT_PUBLIC_SITE_URL` / kanonische URL auf Production-Domain setzen. |
| SEC-07 | Info | Zettle `TestMessage` ohne Signatur → `{ok:true}` (Ping). | Akzeptabel; sicherstellen, dass keine Business-Mutation daran hängt (aktuell der Fall). |
| SEC-08 | Info | Admin-Schutz in Layout/Actions, **nicht** in Edge-Middleware. | Defense-in-Depth optional; aktuell APIs/Actions geprüft — kein offener Admin-Datenleak gefunden. |
| SEC-11 | Info (positiv) | `COMMERCE_MAINTENANCE_SECRET`: korrekt → 200 Maintenance-Payload; falsch → 401. Falsches Admin-Passwort → keine Session; Sign-out invalidiert Admin-APIs wieder (401). Unauth auf `/admin/*` → 307 Login. | Beibehalten. |

### Öffentliche Oberfläche (bewusst)

Gast-Checkout, Cart-Actions, Storefront-Suggest, `katalog.json`, Webhooks (signiert) — erwartbar für Commerce. Keine ungeschützte Admin-JSON-API gefunden.

### Authentifizierte Admin-Checks (Nachtest)

- Login Seed-Default → **erfolgreich** (SEC-09)  
- Admin-Seiten 200: Dashboard, Products, Customers, Bestand, Categories, Collections, Promotions, Versand, Emails, Einstellungen, Integrationen, Termine, Inhalte, Marketing  
- **`/admin/orders` → 500** (SEC-10); Order-Detail OK  
- `/api/admin/search`, `/api/admin/order-alerts` mit Session → 200 (Alerts enthalten Order-E-Mails)  
- Falsches Passwort → Session `null`  
- Sign-out → Admin-API wieder 401  

### Weiterhin nicht abgedeckt

- Kundenportal-Login / Magic-Link / DSGVO-Export (keine `E2E_CUSTOMER_*` Secrets)  
- Authentifizierte Admin-Server-Actions / IDOR zwischen Admins  
- Echter Checkout-Happy-Path gegen PayPal (außerhalb Scope)

---

## 4. Reproduktion

```bash
# Security
BASE_URL=https://ecom-seven-livid.vercel.app bash scripts/security/go-live-surface-check.sh

# Last (30 VUs)
BASE_URL=https://ecom-seven-livid.vercel.app k6 run scripts/load/k6-go-live-30vu-stability.js

# Performance (Beispiel)
npx lighthouse https://ecom-seven-livid.vercel.app/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=desktop --throttling-method=provided \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
```

---

## 5. Nächste Schritte (kurz)

### Umgesetzt im Branch (Code + DB)

1. **Seed-Admin:** `admin@example.com` in der Preview-DB **deaktiviert**; Auth lehnt `change-me-now` in `NODE_ENV=production` ab; Seed schreibt Default-Passwort nicht mehr in Prod-like Envs.  
2. **`/admin/orders` 500:** Ursache war Server-Import von `formatOrderCreatedAt` aus `"use client"` — Formatter nach `lib/orders/format-order-created-at.ts` verschoben.  
3. **Performance:** `unstable_cache` (60 s + Tags) für Homepage-CMS, Produkt-/Kategorie-/Kollektionslisten; `Promise.all` in Header/Footer/`/produkte`; Bild-`take: 5`; Curated-List mit DB-`take`.  
4. **PayPal-Webhook:** weiterhin **Operator-Schritt** — in Vercel `PAYPAL_WEBHOOK_ID` setzen und Webhook-URL auf `/api/webhooks/paypal` (siehe `.env.example`).

### Offen

5. ~~Nach Deploy: k6 + Lighthouse erneut gegen Preview.~~ → siehe **§6** / **§7 Retest** (k6 weiterhin durch Vercel Security Checkpoint blockiert).  
6. Workshop-Rate-Limit + shared Rate-Limit für öffentliche APIs.  
7. Kanonische Site-URL in `llms.txt` / Sitemap.  
8. Authentifizierter Admin-Nachtest mit `E2E_ADMIN_*` (**Secrets fehlen weiterhin** — frischer Agent-Boot 14:08 UTC).  
9. Kundenportal-Nachtest mit `E2E_CUSTOMER_*` (Secrets fehlen weiterhin).  
10. Operator: `PAYPAL_WEBHOOK_ID` + Live-Webhook-URL (nicht durch Agent konfigurieren).  
11. Operator: Vercel Security Checkpoint / Bot-Protection für Lasttools (k6) whitelisten oder Challenge-Bypass für CI.

---

## 6. Retest nach P0-Fixes (2026-08-13, ~13:50–14:05 UTC)

**Agent:** Cloud-Nachtest laut `docs/go-live/HANDOFF_AUTH_AND_RETEST.md`  
**Ziel:** `https://ecom-seven-livid.vercel.app/`  
**Artefakte:** `/opt/cursor/artifacts/go-live-tests/` (`auth-smoke.txt`, `security-surface-retest.txt`, `ttfb-retest.csv`, `lighthouse/home-retest.*`, `k6-retest*.txt|json`, `curl-load-30vu.csv`, `k6-403-sample.txt`)

### 6.1 Secret-Sanity

| Secret | Status |
|--------|--------|
| `CLOUD_AGENT_INJECTED_SECRET_NAMES` | `AUTH_SECRET`, `COMMERCE_MAINTENANCE_SECRET`, `DATABASE_URL` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | **fehlen** |
| `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` | **fehlen** |

**Folge:** Authentifizierte Admin-Smokes (`/admin/orders` → 200, Search mit Session, Sign-out) und Kundenportal **nicht** ausführbar. Kein Raten von Credentials; Seed-Default nicht als Login-Ersatz genutzt.

### 6.2 Auth / Admin (ohne E2E)

| Check | Ergebnis |
|-------|----------|
| Seed-Default `admin@example.com` / `change-me-now` → Session | **PASS** — Session `null` (SEC-09 behoben auf dieser Umgebung) |
| Falsches Passwort → Session | **PASS** — keine Session |
| `GET /admin`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/einstellungen` ohne Cookie | **PASS** — HTTP 307 → `/admin/login` |
| `GET /api/admin/search` ohne Cookie | **PASS** — HTTP 401 |
| Authentifiziertes `/admin/orders` (SEC-10 Verify) | **BLOCKIERT** — keine `E2E_ADMIN_*` |
| Kundenportal | **SKIP** — keine `E2E_CUSTOMER_*` |

### 6.3 Security Surface Retest

`bash scripts/security/go-live-surface-check.sh` → alle erwarteten Gates **PASS**.

- PayPal-Webhook ohne Config: weiterhin **503** `webhook_not_configured` (**bekannt offen**, Operator — nicht „gefixt“).  
- Rate-Limit Burst `product-suggest` 40×: weiterhin **0× 429** (SEC-02 unverändert).  
- `llms.txt` zeigt weiterhin nicht-kanonischen Vercel-Host (SEC-06).

### 6.4 Single-User TTFB (curl, 3 Läufe)

| Pfad | typ. TTFB (Retest) | Baseline |
|------|-------------------:|---------:|
| `/` | **2,0–2,4 s** | 2,3–3,7 s |
| `/produkte` | ~1,2 s | ~1,2 s |
| `/produkte/design-katzenhoehle` | ~1,8 s | ~1,8–1,9 s |
| `/warenkorb` | ~0,45 s | ~0,45 s |
| `/termine` | ~1,0 s | ~1,0–1,4 s |
| `/admin/login` | ~60–170 ms | ~60 ms |

Leichte Verbesserung auf der Home-TTFB; weiterhin deutlich über dem Ideal (&lt; 0,8 s).

### 6.5 Lighthouse Home (Desktop, `throttling-method=provided`, `--preset=desktop`)

| Metrik | Retest | Baseline |
|--------|-------:|---------:|
| Performance | **66** | 61 |
| LCP | **3034 ms** | 3776 ms |
| FCP | **3034 ms** | 3658 ms |
| CLS | **0** | 0 |
| a11y / BP / SEO | 89 / 100 / 92 | — |

Home-LCP weiterhin über „Good“ (2,5 s), aber besser als Baseline.

### 6.6 Lasttest 30 VUs

#### A) `npm run load:k6:go-live` (Standard-UA)

- **Ergebnis: nicht auswertbar für App-Latenz** — praktisch **100 % HTTP 403**.  
- Body: **„Vercel Security Checkpoint“** (Astro-Challenge-Page, ~31 KB, ~4 ms).  
- Auch mit Browser-`User-Agent` weiterhin 403 → vermutlich TLS-/Client-Fingerprint / Bot-Mitigation, nicht nur UA-String.  
- Thresholds `http_req_failed` / `checks` **crossed** (Messartefakt der Checkpoint-Blockade).

#### B) Ersatz: curl, 30 parallele Worker, ~120 s, gleiche Lesepfade

| Metrik | Wert |
|--------|------|
| Requests | 228 |
| HTTP 200 | **87 %** (199) |
| HTTP 403 (Checkpoint) | **13 %** (29) |
| p50 `total` (nur 200) | **~17,7 s** |
| p95 `total` (nur 200) | **~43,8 s** |
| Requests &lt; 10 s (nur 200) | **~39 %** |

Antwortzeiten unter Last weiterhin **nicht go-live-tauglich** (vergleichbar zur Baseline p95 ~48 s). Zusätzlich greift unter Last der **Vercel Security Checkpoint** auch gegen curl.

### 6.7 Retest-Gesamturteil

| Block | Ergebnis | Kurzfazit |
|-------|----------|-----------|
| Secrets `E2E_*` | **Blocker** | Admin-/Kunden-Auth-Nachtest unmöglich |
| Seed-Default / Unauth-Gating | **Bestanden** | SEC-09 verifiziert behoben |
| `/admin/orders` auth | **Nicht geprüft** | braucht `E2E_ADMIN_*` |
| Security Surface | **Bestanden** (PayPal offen) | fail-closed wie zuvor |
| TTFB / Lighthouse Home | **Teilweise besser** | LCP/TTFB Home verbessert, Budget verfehlt |
| Last 30 VUs | **Nicht bestanden** / k6 blockiert | curl-p95 ~44 s; k6 durch Checkpoint 403 |

**Empfehlung:** `E2E_ADMIN_*` (+ optional `E2E_CUSTOMER_*`) in die Cursor Cloud Environment injizieren und Auth-Smokes wiederholen; Vercel Security Checkpoint für Lastmessung klären; Server-/Cache-Latenz unter Concurrency weiter adressieren; PayPal-Webhook durch Operator setzen.

---

## 7. Frischer Agent-Nachtest (2026-08-13, ~14:08–14:15 UTC)

**Agent:** neuer Cloud-Boot laut `docs/go-live/HANDOFF_AUTH_AND_RETEST.md` (bc-…-b078)  
**Ziel:** `https://ecom-seven-livid.vercel.app/`  
**Artefakte:** `/opt/cursor/artifacts/go-live-tests/` (`auth-smoke-retest2.txt`, `security-surface-retest2.txt`, `ttfb-retest2.csv`, `lighthouse/home-retest2.*`, `k6-retest2.txt`, `curl-load-30vu-retest2.csv`, `curl-status-sample-retest2.txt`, `k6-403-sample-retest2.html`)

### 7.1 Secret-Sanity

| Secret | Status |
|--------|--------|
| `CLOUD_AGENT_INJECTED_SECRET_NAMES` | `AUTH_SECRET`, `COMMERCE_MAINTENANCE_SECRET`, `DATABASE_URL` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | **fehlen** |
| `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` | **fehlen** |

**Sofortmeldung:** Trotz frischem Boot sind **keine** `E2E_*` Secrets injiziert. Authentifizierte Admin-/Kunden-Smokes weiterhin unmöglich. Kein Raten von Credentials; Seed-Default nicht als Login-Ersatz genutzt.

### 7.2 Auth / Admin

| Check | Ergebnis |
|-------|----------|
| Seed-Default `admin@example.com` / `change-me-now` → Session | **PASS** — Session `null` / leer |
| Falsches Passwort → Session | **PASS** — keine Session |
| `GET /admin`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/einstellungen` ohne Cookie | **PASS** — HTTP 307 → `/admin/login` |
| `GET /api/admin/search` ohne Cookie | **PASS** — HTTP 401 |
| Authentifiziertes `/admin/orders` (SEC-10 Verify) | **BLOCKIERT** — keine `E2E_ADMIN_*` |
| Kundenportal | **SKIP** — keine `E2E_CUSTOMER_*` |

### 7.3 Security Surface

`bash scripts/security/go-live-surface-check.sh` → erwartete Gates **PASS**.

- PayPal-Webhook: weiterhin **503** `webhook_not_configured` (**bekannt offen**, Operator — nicht konfiguriert).  
- Rate-Limit Burst `product-suggest` 40×: **0× 429** (SEC-02).  
- `llms.txt` / Canonical: weiterhin nicht-kanonischer Vercel-Host (SEC-06).

### 7.4 Single-User TTFB (curl, 3 Läufe)

| Pfad | typ. TTFB (dieser Lauf) | §6 Retest | Baseline |
|------|------------------------:|----------:|---------:|
| `/` | **2,7–4,5 s** (med ~3,6 s) | 2,0–2,4 s | 2,3–3,7 s |
| `/produkte` | **1,2–2,7 s** | ~1,2 s | ~1,2 s |
| `/produkte/design-katzenhoehle` | ~1,8 s | ~1,8 s | ~1,8–1,9 s |
| `/warenkorb` | ~0,45 s | ~0,45 s | ~0,45 s |
| `/termine` | ~0,9–1,0 s | ~1,0 s | ~1,0–1,4 s |
| `/admin/login` | ~66–74 ms | ~60–170 ms | ~60 ms |

Home-/Katalog-TTFB in diesem Lauf **volatiler/langsamer** als §6 (vermutlich Cold-Start / Cache-Miss / Region). Ideal (&lt; 0,8 s) weiterhin verfehlt.

### 7.5 Lighthouse Home (Desktop, `throttling-method=provided`, `--preset=desktop`)

| Metrik | Dieser Lauf | §6 Retest | Baseline |
|--------|------------:|----------:|---------:|
| Performance | **67** | 66 | 61 |
| LCP | **2913 ms** | 3034 ms | 3776 ms |
| FCP | **2913 ms** | 3034 ms | 3658 ms |
| CLS | **0** | 0 | 0 |
| a11y / BP / SEO | 89 / 100 / 92 | 89 / 100 / 92 | — |

Home-LCP weiterhin über „Good“ (2,5 s); leichte weitere Verbesserung ggü. §6.

### 7.6 Lasttest 30 VUs

#### A) `npm run load:k6:go-live`

- **Ergebnis: nicht auswertbar für App-Latenz** — **99,74 %** `http_req_failed` (3094/3102).  
- Einzel-`curl` mit k6-UA kann 200 liefern; unter Last greift **Vercel Security Checkpoint** (403, Astro-Challenge-Page).  
- Stichprobe 20 parallele curl: **16× 200 / 4× 403** Checkpoint.  
- Thresholds `http_req_failed` / `checks` crossed (Messartefakt).  
- Erwartete echte 200er (wenige): p95 Dauer ~4 s — nicht repräsentativ wegen Blockade.

#### B) Ersatz: curl, 30 parallele Worker, ~120 s

| Metrik | Wert |
|--------|------|
| Requests | 188 |
| HTTP 200 | **90 %** (170) |
| HTTP 403 (Checkpoint) | **10 %** (18) |
| p50 `total` (nur 200) | **~20,7 s** |
| p95 `total` (nur 200) | **~50,5 s** |
| Requests &lt; 10 s (nur 200) | **~22 %** |

Antwortzeiten unter Last weiterhin **nicht go-live-tauglich** (vergleichbar/schlechter als §6 p95 ~44 s / Baseline ~48 s). Checkpoint bleibt unter Concurrency aktiv.

### 7.7 Gesamturteil (dieser Lauf)

| Block | Ergebnis | Kurzfazit |
|-------|----------|-----------|
| Secrets `E2E_*` | **Blocker** | weiterhin nicht injiziert |
| Seed-Default / Unauth-Gating | **Bestanden** | SEC-09 bestätigt |
| `/admin/orders` auth | **Nicht geprüft** | braucht `E2E_ADMIN_*` |
| Kundenportal | **SKIP** | braucht `E2E_CUSTOMER_*` |
| Security Surface | **Bestanden** (PayPal offen) | fail-closed; Webhook Operator |
| TTFB / Lighthouse Home | **Teilweise** | LCP leicht besser; TTFB volatil/hoch |
| Last 30 VUs | **Nicht bestanden** / k6 blockiert | curl-p95 ~50 s; k6 ~100 % Checkpoint |

**Empfehlung (unverändert):** `E2E_ADMIN_*` (+ optional `E2E_CUSTOMER_*`) in Cursor Cloud Environment injizieren und Auth-Smokes wiederholen; Vercel Security Checkpoint für Lasttools klären; SSR/Cache unter Concurrency weiter adressieren; PayPal-Webhook durch Operator setzen.
