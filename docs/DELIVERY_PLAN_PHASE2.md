# DELIVERY_PLAN_PHASE2.md

Fortführung von [DELIVERY_PLAN.md](./DELIVERY_PLAN.md) (Epics 1–6). Gleiche Philosophie: kleine, vertikal nutzbare Inkremente.

**Stand (Kurzüberblick, Stand Repo):** Epics 7–9 sind teils bereits im Code umgesetzt; Details und offene Feinarbeit siehe unter jedem Epic. Zusätzlich umgesetzt: **Startseite Marketing** (Amazon-Zitat-Slider + Social-Bilder, Admin `/admin/startseite`, Migration `20260412120000_homepage_marketing_content`).

---

## Epic 7: Privacy, Consent & Cookie-Banner

**Goal:** Rechtskonforme Einwilligung für nicht notwendige Technologien; Grundlage für spätere Analytics/Marketing.

**Stories:**
1. Consent-Konzept & Datenschutz-Text (inkl. Cookie-Übersicht).
2. Consent-State im Frontend (Versionierung, `localStorage`).
3. Cookie-Banner-UI (barrierearm, Markengrün).
4. Cookie-Einstellungen dauerhaft (Footer / erneutes Öffnen).
5. Kopplung an Drittanbieter-Skripte (wenn Tools angebunden sind).
6. Tests (Vitest + Playwright).

**Konzept:** Siehe [CONSENT_CONCEPT.md](./CONSENT_CONCEPT.md).

**Umsetzungsstand (Repo):**

| Story | Kurz | Status |
|-------|------|--------|
| 1 | Consent-Konzept & Texte | [CONSENT_CONCEPT.md](./CONSENT_CONCEPT.md) vorhanden; Datenschutz-HTML um Abschnitt „Hinweis zum Cookie-Banner“ (Banner, `localStorage`, Kategorien, Footer-Link) ergänzt. |
| 2–4 | State, Banner, Footer | `CookieConsentBanner` im Storefront-Layout, `localStorage` + Versionierung (`lib/consent/`), Cookie-Einstellungen in der Fußzeile. |
| 5 | Drittanbieter-Skripte | Vorbereitet (`consentAllowsStatistics` / Marketing); GTM/Matomo erst bei echter Einbindung. |
| 6 | Tests | Vitest `consent-storage`; Playwright `tests/e2e/cookie-consent.spec.ts`. |

---

## Epic 8: SEO, strukturierte Daten & KI-/Agenten-Discoverability

**Goal:** Technisches SEO, JSON-LD, OG; steuerbare Sichtbarkeit für Suchmaschinen und KI-Crawler.

**Stories:**
1. Sitemap, robots.txt, Canonicals.
2. JSON-LD (Product/Offer, optional Organization).
3. Open Graph / Twitter Cards.
4. `/llms.txt` (o. Ä.) für Agenten-Hinweise.
5. Crawler-Richtlinien (GPTBot, Google-Extended, …).
6. Messung / CI-Regression (Lighthouse, Smoke).

**Umsetzungsstand (Repo):**

| Story | Kurz | Status |
|-------|------|--------|
| 1 | Sitemap, robots, Canonicals | `app/sitemap.ts`, `app/robots.ts`, [canonical-origin.ts](../lib/site/canonical-origin.ts). |
| 2 | JSON-LD | Produkt: `ProductJsonLd` auf der PDP. |
| 3 | OG / Social | `openGraph` u. a. in Root-`app/layout.tsx` und Produktdetail. |
| 4 | Agenten-Hinweise | `app/llms.txt/route.ts`. |
| 5 | Crawler-Richtlinien | `app/robots.ts`: `*` plus explizite Regeln u. a. für GPTBot, ChatGPT-User, OAI-SearchBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Bytespider; Vitest `tests/unit/robots-crawler-policy.test.ts`. |
| 6 | CI / Lighthouse | GitHub Actions Job `lighthouse` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml): Postgres-Service, `prisma migrate deploy`, `next build`, `next start`, dann `npx @lhci/cli` mit [lighthouserc.json](../lighthouserc.json). Lighthouse-Schritt `continue-on-error: true` + lockere Warn-Schwellen gegen Runner-Flakes. Lokal: `npm run lighthouse:ci` (Server vorher auf Port 3000). |

---

## Epic 9: Zahlungsanbieter & Zahlungsfluss

**Goal:** Echte Zahlungen inkl. Webhooks, idempotenter Zuordnung, Admin-Sicht.

**Strategie:** [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md) (PayPal Orders v2, Variablen, nächste Schritte).

**Stories:**
1. Provider-Strategie & Vertrag.
2. Prisma-Domain (Payment / Session).
3. Checkout-Integration (Redirect/Embedded).
4. Webhooks & Order-Status.
5. Admin & E-Mail-Flows abstimmen.
6. Sicherheit & Tests.

**Umsetzungsstand (Repo):**

| Story | Kurz | Status |
|-------|------|--------|
| 2 | Prisma `OrderPayment` | Modell + Migration `order_payments`. |
| 3–4 | Checkout & Rückkehr | Zahlungsart PayPal mit `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` → `pending_payment`, Redirect zu PayPal; `GET /checkout/paypal-rueckkehr` mit Capture; Finalisierung `paid` + **Verfügbarer Bestand** (`available_quantity`) + Bestätigungsmail; physisches Lager (`stock_quantity`) bei Status **shipped**. Vorkasse unverändert. Optional: PayPal-Webhooks ergänzen. |
| 5 | Admin & E-Mail | Admin-Bestellungen inkl. Zahlungszeilen; E-Mail erst nach `paid` bei Online-Zahlung. |
| 6 | Sicherheit & Tests | Integrationstest PayPal-Rückkehr-Route; erweiterte E2E optional. |

**Env:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, optional `PAYPAL_ENV`; siehe [.env.example](../.env.example). **Migrate:** Pooler-P1002 → `DIRECT_DATABASE_URL` / `PRISMA_MIGRATE_DATABASE_URL` oder SQL im Supabase-Editor, siehe Projekt-Doku/Chats.

---

## Epic 10: Security Assurance, API-Absicherung & sicheres Shopping

**Goal:** Nachweisbare Absicherung aller HTTP-Endpunkte; Missbrauchsschutz (Login, Checkout, Webhooks).

**Stories:**
1. API-/Route-Inventar ([SECURITY_SURFACE.md](./SECURITY_SURFACE.md) – fortlaufend pflegen).
2. Automatisierte AuthZ-Negative-Tests.
3. Rate-Limiting (Auth, Checkout, …).
4. Eingabe- & Geschäftslogik-Härtung.
5. CSP / HSTS / Cookie-Flags (Ausbau).
6. Supply Chain (`npm audit`, CI).
7. Optional: DAST-Baseline (ZAP).

**Umsetzungsstand (Repo, laufende Ergänzung):**

| Story | Kurz | Status |
|-------|------|--------|
| 1 | Inventar | [SECURITY_SURFACE.md](./SECURITY_SURFACE.md) inkl. neuer Admin-Actions (Startseite, Versand) und Hinweis Login-Rate-Limit. |
| 2 | AuthZ-Negative | Integrationstests `tests/integration/admin-api-authz.test.ts` (Admin-APIs ohne Session → 401). |
| 3 | Rate-Limiting | In-Memory: Admin-Credentials (`sign-in-rate-limit.ts` + Auth-Route); PayPal-Checkout-APIs (`paypal-checkout-api-rate-limit.ts` + `create-order` / `capture-order`). |
| 5 | HSTS | `Strict-Transport-Security` für Vercel (`VERCEL=1`) in [next.config.ts](../next.config.ts). CSP bewusst nicht global (PayPal-Skripte). |
| 6 | Supply Chain | CI-Job `check`: `npm audit --audit-level=high` nach `npm ci` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). |

---

## Epic 11: Performance, Skalierung & Lasttests

**Goal:** Stabile Latenz und Lastverhalten für Shop-kritische Pfade.

**Stories:**
1. Web-Vitals & Budgets.
2. Lighthouse CI / Regression.
3. Lasttests (Staging, k6/Artillery o. Ä.).
4. DB-Indizes & N+1-Review.
5. Caching / CDN-Strategie.
6. Optional: SLOs & Alarmierung.

---

## Abhängigkeiten (Kurz)

- Epic 8 / 9 profitieren von Epic 7, sobald Drittanbieter-Cookies relevant sind.
- Epic 10 sollte nach oder parallel zu Epic 9 (Webhooks) priorisiert werden.
- Epic 11: Vitals früh; Checkout-Last nach Rate-Limits (Epic 10).

Siehe auch den detaillierten Arbeitsplan unter `.cursor/plans/` (Epics 7–11).
