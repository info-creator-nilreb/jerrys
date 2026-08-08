# Epic 9 — Hardening & Go-Live (Agent-Handoff)

**Zielgruppe:** Cloud-/Cursor-Agent  
**Basis:** `main` bzw. nach Merge von Epic 8 (PR #32)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-9-hardening-and-go-live)  
**Zahlung (Delivery Plan):** [PAYMENT_PROVIDER_STRATEGY.md](./PAYMENT_PROVIDER_STRATEGY.md)

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

### Slice 2 — Ops-Runbooks (kurz)

- Provider-Ausfall PayPal, Queue/Outbox, Restore/Rollback-Hinweise in `OPERATIONS.md` schärfen

### Slice 3 — Load / Resilience Gates

- `k6`-Smoke erweitern oder dokumentieren; kritische Fehlerpfade in CI absichern

### Slice 4 — Go-Live Checklist

- Staging-Migration rehearsed, Secrets Preview≠Production, Monitoring/Alerts

---

### Slice-Status

| Slice | Status |
| --- | --- |
| 1 PayPal-Webhooks | erledigt (Branch `cursor/epic9-slice1-paypal-webhooks-1782`) |
| 2 Ops-Runbooks | offen |
| 3 Load/Resilience | offen |
| 4 Go-Live Checklist | offen |

---

## Copy-Paste — nächster Agent (Slice 2+)

```
Epic 9 (PLATFORM_ROADMAP: Hardening and Go-Live) fortsetzen.

Lies:
- docs/EPIC9_HARDENING_GO_LIVE.md
- docs/OPERATIONS.md
- docs/PLATFORM_ROADMAP.md#epic-9-hardening-and-go-live

Slice 1 (PayPal-Webhooks) ist erledigt. Beginne mit Slice 2: Ops-Runbooks.
Antworten auf Deutsch.
```
