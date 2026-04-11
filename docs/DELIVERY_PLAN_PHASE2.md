# DELIVERY_PLAN_PHASE2.md

Fortführung von [DELIVERY_PLAN.md](./DELIVERY_PLAN.md) (Epics 1–6). Gleiche Philosophie: kleine, vertikal nutzbare Inkremente.

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

---

## Epic 9: Zahlungsanbieter & Zahlungsfluss

**Goal:** Echte Zahlungen inkl. Webhooks, idempotenter Zuordnung, Admin-Sicht.

**Strategie:** [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md) (Stripe als PSP, Variablen, nächste Schritte).

**Stories:**
1. Provider-Strategie & Vertrag.
2. Prisma-Domain (Payment / Session).
3. Checkout-Integration (Redirect/Embedded).
4. Webhooks & Order-Status.
5. Admin & E-Mail-Flows abstimmen.
6. Sicherheit & Tests.

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
