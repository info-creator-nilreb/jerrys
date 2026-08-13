# Go-Live Test Findings

**Ziel:** `https://ecom-seven-livid.vercel.app/`  
**Datum:** 2026-08-13 (UTC)  
**Scope:** Lasttest (bis 30 parallele Nutzer), Performance (Web Vitals / Lighthouse), Security Surface (eigene Architektur, keine Drittanbieter-Angriffe)  
**Auth-Hinweis:** In den Cloud-Agent-Secrets lagen **keine** `E2E_ADMIN_*` / Kunden-Credentials vor (nur `AUTH_SECRET`, `COMMERCE_MAINTENANCE_SECRET`, `DATABASE_URL`). Authentifizierte Admin-Tests liefen über den noch aktiven Seed-Account `admin@example.com` / `change-me-now` — das ist selbst ein kritisches Finding (SEC-09).

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
| SEC-09 | **Kritisch (Go-Live)** | Seed-Admin `admin@example.com` mit Default-Passwort `change-me-now` ist auf der Preview **noch gültig**; Login → Session `subjectKind=admin` → Admin-APIs (Search, Order-Alerts mit E-Mail/Betrag). Zweiter Admin in DB: `berlin.alexander@icloud.com`. | Sofort Passwort rotieren oder Seed-User löschen/deaktivieren; vor Live kein Default-Seed-Passwort. |
| SEC-10 | **Hoch (Funktional)** | Authentifiziert: `GET /admin/orders` liefert **HTTP 500** (Error-Page). Order-Detail `/admin/orders/[id]` ist 200. | Bestellliste vor Livegang fixen; Stacktrace in Vercel-Logs prüfen. |
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

5. Nach Deploy: k6 + Lighthouse erneut gegen Preview.  
6. Workshop-Rate-Limit + shared Rate-Limit für öffentliche APIs.  
7. Kanonische Site-URL in `llms.txt` / Sitemap.  
8. Kundenportal-Nachtest mit `E2E_CUSTOMER_*` (Secrets in Cursor Environment, neuer Agent-Lauf).
