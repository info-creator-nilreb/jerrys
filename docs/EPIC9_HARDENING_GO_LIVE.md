# Epic 9 — Hardening & Go-Live (Agent-Handoff)

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis:** `main` bzw. nach Merge von Epic 8 (PR #32)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-9-hardening-and-go-live)  
**Zahlung (Delivery Plan):** [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md)  
**Ops:** [OPERATIONS.md](./OPERATIONS.md)

---

## Abgrenzung

| Bezeichnung | Dokument | Inhalt |
| --- | --- | --- |
| **Epic 9 PLATFORM** (dieses Handoff) | `PLATFORM_ROADMAP.md` | Hardening, Recovery, Runbooks, Go-Live-Gates |
| „Epic 9 Zahlung“ | `DELIVERY_PLAN_PHASE2.md` | PayPal Orders — **weitgehend erledigt**; Webhooks = Slice 1 hier |

---

## Vorgeschlagene Slices

Branch-Prefix: `cursor/epic9-slice<N>-<kurzname>-1782` (bzw. laufende Agent-Suffix-Konvention)

### Slice 1 — PayPal-Webhooks

- `POST /api/webhooks/paypal` mit Signaturprüfung (`PAYPAL_WEBHOOK_ID`)
- Events: `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED` → `completePayPalCaptureFlow` (idempotent via Webhook-Inbox + Capture-Inbox)
- `SECURITY_SURFACE.md`, Env in `.env.example` / Vercel-Doku / `PAYMENT_PROVIDER_STRATEGY.md`
- Unit-/Integrationstests (Header/Order-ID-Extraktion, Rate-Limit, 503 ohne Webhook-ID, 401 ungültige Signatur, Happy Path mit Verify-Mock)

**Schlüsseldateien:** `app/api/webhooks/paypal/route.ts`, `lib/payments/paypal-webhook-verify.ts`, `lib/security/paypal-webhook-api-rate-limit.ts`

### Slice 2 — Ops-Runbooks

- Konkretisierte Runbooks in [OPERATIONS.md](./OPERATIONS.md): Rollback, PayPal-Ausfall, extern bezahlt/intern offen, Webhook-/Outbox-Backlog, DB-Restore-Kurzform

### Slice 3 — Load / Resilience Gates

- `scripts/load/k6-smoke.js`: Storefront + Warenkorb + unsignierter Webhook (kontrollierte 4xx/503)
- Hinweis in [TEST_STRATEGY.md](./TEST_STRATEGY.md); CI bleibt ohne hartes k6-Gate (Runner ohne k6-Binary)

### Slice 4 — Go-Live Checklist

Siehe Abschnitt unten; vor Production-Cutover abarbeiten.

---

### Slice-Status

| Slice | Status |
| --- | --- |
| 1 PayPal-Webhooks | erledigt (Branch `cursor/epic9-slice1-paypal-webhooks-1782`, PR #33) |
| 2 Ops-Runbooks | erledigt (`OPERATIONS.md`) |
| 3 Load/Resilience | erledigt (k6-Smoke erweitert, dokumentiert) |
| 4 Go-Live Checklist | erledigt (Checkliste unten; Operator-Abarbeitung offen) |

---

## Go-Live Checklist (Slice 4)

### Staging / Preview

- [ ] Staging-DB getrennt von Production; keine Prod-Kundendaten in Preview
- [ ] Migrationen auf Staging rehearsed (expand/contract); Rollback-Pfad verstanden
- [ ] Secrets Preview ≠ Production (`AUTH_SECRET`, `DATABASE_URL`, PayPal Sandbox vs Live)
- [ ] PayPal Sandbox: Create → Approve/Return → Capture; Webhook-URL + `PAYPAL_WEBHOOK_ID` gesetzt
- [ ] `commerce-maintenance` Cron/Secret auf Staging oder manueller Call OK (`?mode=critical` und `?mode=full`)
- [ ] GitHub Actions Secrets gesetzt: `COMMERCE_MAINTENANCE_SITE_URL` + `COMMERCE_MAINTENANCE_SECRET` (ohne sie läuft nur Vercel-Tages-Cron — zu selten für Workshop-Holds)
- [ ] `npm run validate` + relevante E2E grün auf Release-Commit

### Production readiness

- [ ] `PAYPAL_ENV=live` + Live-Credentials nur in Production; Webhook auf Production-Host
- [ ] Transaction-Pooler `DATABASE_URL` (`:6543`); `DIRECT_DATABASE_URL` für Migrate
- [ ] Alerts verdrahtet (Payment-Fehler, Webhook-Signatur, Outbox-Backlog via `outboxBacklog.stalePendingCount` / `oldestPendingAgeSeconds` > 15 Min., 5xx) — mindestens Log-Queries/Dashboards benannt
- [ ] Workflow „Commerce maintenance“ in GitHub Actions auf Production-URL grün (manuell `workflow_dispatch` mit `critical`)
- [ ] Restore-Übung geplant oder dokumentiert ([OPERATIONS.md](./OPERATIONS.md) Backup and Recovery)
- [ ] Support kennt Runbooks: PayPal-Ausfall, „bezahlt aber nicht finalisiert“, Webhook-Backlog
- [ ] Cutover: Feature-Risiken bewusst (kein stiller Live-PayPal ohne Webhook-ID)

### Nach Go-Live (erste 48 h)

- [ ] Stichprobe echte/Sandbox-ähnliche Bestellung inkl. Mail
- [ ] `webhook_inbox_entries` / `integration_outbox_messages` ohne wachsenden `failed`-Rücken
- [ ] Keine `EMAXCONNSESSION` / Pool-Saturation in Logs

---

## Copy-Paste — nächster Agent

```
Epic 9 Slices 1–4 sind im Repo dokumentiert/umgesetzt (PR #33).

Offen für Operatoren: Go-Live-Checkliste in docs/EPIC9_HARDENING_GO_LIVE.md
abarbeiten (Staging-Rehearsal, Secrets, Alerts, PayPal Live+Webhook).

Nächste Produkt-Epics: PLATFORM Roadmap (Workshops/Zettle/Accounts) bzw.
Delivery-Plan Security — nicht Epic-9-Slices neu aufrollen.
Antworten auf Deutsch.
```
