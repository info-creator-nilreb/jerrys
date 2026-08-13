# Merge: Epic 1 Commerce Core (PR #1)

## Kurz

- **Branch:** `cursor/epic-1-commerce-core-a364` → `main`
- **PR:** [#1](https://github.com/info-creator-nilreb/jerrys/pull/1)
- **Nicht mitmergen:** [#3](https://github.com/info-creator-nilreb/jerrys/pull/3) (Bestand — durch `stock_reservations` ersetzt)

## Nach dem Merge (Staging/Production)

```bash
npm run db:migrate   # Migration 20260806200000_epic1_commerce_core
```

**Neue Env (optional, empfohlen):**

```bash
COMMERCE_MAINTENANCE_SECRET="<openssl rand -hex 32>"
CRON_SECRET="<gleicher oder eigener Wert>"   # Vercel Cron sendet Bearer CRON_SECRET
```

Periodisch: Vercel Cron via `vercel.json` (GET) oder manuell:

```bash
curl -sS -X POST "https://<host>/api/internal/commerce-maintenance?mode=critical" \
  -H "Authorization: Bearer $COMMERCE_MAINTENANCE_SECRET"
```

## Changelog (Epic 1)

### Added

- `orders.fulfillment_status`, `stock_reservations`, `stock_movements`, `integration_outbox_messages`, `webhook_inbox_entries`
- Reservierung bei Checkout (`pending_payment`), Commit bei Zahlung, Release bei Storno/TTL
- `GET`/`POST /api/internal/commerce-maintenance?mode=critical|full` (Stock/Holds/PayPal; full + Outbox/Instagram/Zettle; Cron in `vercel.json` + GitHub Action)
- Admin: Fulfillment-Anzeige, Bestandsreservierungen auf Bestelldetail
- Module `features/inventory`, `features/orders`, `features/integrations`

### Changed

- Checkout/PayPal-Finalisierung nutzt Reservierungs-Commit statt direkter Doppel-Abbuchung
- Versand reduziert physisches Lager inkl. Audit (`stock_movements`)
- Admin Lieferbarkeit: Hilfetext + Layout (Desktop-Ausrichtung)

### Dev / Ops

- `npm run dev:cloud`, `npm run dev:stop`, `.cursor/environment.json`
- `allowedDevOrigins`, Dev-Indikator `bottom-right`, Doku [`CURSOR_CLOUD_AGENT.md`](./CURSOR_CLOUD_AGENT.md)

## Verifikation

```bash
npm run validate
npm run test:unit -- tests/unit/fulfillment-status-machine.test.ts tests/unit/reservation-ttl.test.ts
npm run test:integration -- tests/integration/commerce-maintenance-route.test.ts
```

Manuell: siehe [`EPIC1_COMMERCE_CORE.md`](./EPIC1_COMMERCE_CORE.md).
