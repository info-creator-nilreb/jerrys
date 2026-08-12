# Vercel Operations Baseline

## Deployment Topology

Vercel remains the deployment platform for the Next.js application.

Cloud build and fully remote development options are described in [CLOUD_DEVELOPMENT.md](./CLOUD_DEVELOPMENT.md). GitHub Actions is the authoritative quality pipeline; Vercel builds branch previews and production artifacts remotely when Git integration is enabled.

| Environment | Purpose | Data and providers |
| --- | --- | --- |
| Preview | Pull-request UI and isolated smoke checks | Synthetic data; no production credentials or customer data |
| Staging | Release candidate, migrations, provider sandbox, E2E | Dedicated database, storage, queue, and sandbox credentials |
| Production | Customer traffic | Production database, storage, queue, and provider credentials |

Production data must not be copied to preview. A staging copy requires an approved, documented anonymization process.

## Required Managed Capabilities

Before the relevant epic reaches production, select and record providers in ADRs for:

- PostgreSQL with connection pooling, automated backups, point-in-time recovery, and restore support
- Object storage for product media, invoices, and shipping labels (public branding/media: Vercel Blob per [ADR-0008](./adr/0008-object-storage.md))
- Durable queue or workflow execution for outbox delivery, retries, reservation expiry, and reconciliation
- Error tracking, structured log aggregation, metrics, and alerting
- Transactional email
- Customer/admin authentication when customer accounts are introduced

Selection criteria include Vercel compatibility, EU data options, data-processing agreement, access control, observability, exportability, cost, and tested recovery.

## Vercel Runtime Rules

- Never rely on local filesystem persistence.
- Never rely on an in-memory timer, rate limiter, queue, or singleton for correctness.
- Use pooled database connections suitable for concurrent serverless invocations.
- **Supabase + Vercel:** Runtime-`DATABASE_URL` = Transaction Pooler (`:6543`). Session Pooler (`:5432`, `pool_size` oft 15) nicht für Serverless-Runtime — sonst `EMAXCONNSESSION`. App-Pool ist auf Vercel auf `max: 1` begrenzt (`lib/db/pg-pool-config.ts`); Override `PG_POOL_MAX`. Migrationen über `DIRECT_DATABASE_URL`.
- Route Handlers that accept webhooks acknowledge only after durable inbox persistence.
- Long-running or retryable work is delegated to the durable job system.
- Set explicit timeouts on provider calls and avoid holding database transactions open across network requests.
- Preview deployments use separate secrets and cannot mutate production providers.

## Deployment Flow

1. Pull request runs `npm run validate`, security scans, integration tests, critical E2E tests, and Lighthouse checks.
2. Vercel builds the commit remotely; preview deployment supports UI review using synthetic data.
3. Staging applies migrations and runs provider-sandbox and migration smoke tests.
4. Production database changes follow expand/contract:
   - deploy additive schema
   - deploy compatible application code
   - backfill through a restartable job
   - verify metrics and data
   - remove old schema in a later release
5. Risky features remain disabled behind an owned feature flag until operational validation completes.
6. Rollback reverts application code without requiring an immediate destructive database rollback.

### Migrationen ausführen

Das Prisma-CLI liegt in `node_modules` und ist **nicht** global installiert — ein direkter Aufruf
scheitert mit `bash: prisma: command not found`. Immer über npm oder `npx` starten:

```bash
npm run db:migrate:status          # welche Migrationen fehlen?
npm run db:migrate:deploy          # ausstehende Migrationen anwenden
npx prisma migrate deploy          # gleichwertig
```

`prisma.config.ts` lädt `.env` und `.env.local` mit Vorrang. Für eine andere Ziel-Datenbank die URL
explizit übergeben (Supabase Pooler kann bei `migrate` mit `P1002` hängen — dann Direktverbindung
`db.PROJECT_REF.supabase.co:5432` verwenden):

```bash
PRISMA_MIGRATE_DATABASE_URL="postgresql://…" npx prisma migrate deploy
```

Neue Tabellen erst nach dem Deploy nutzbar: Die App zeigt bei fehlender Migration eine
verständliche Meldung (`P2021`) statt einer Fehlerseite, speichert aber nichts.

## Shop Settings and Branding (Epic 11)

Zentrale Konfiguration unter `/admin/einstellungen` (`ShopSettings` Singleton `id = default`, [ADR-0006](./adr/0006-shop-settings-branding.md)). Wirkt ohne Redeploy auf Storefront (CSS-Variablen, Metadata, Header/Footer), Admin-Login, Transaktions-E-Mails und Rechnungs-PDF.

| Thema | Hinweis |
| --- | --- |
| Migration | `prisma/migrations/20260811120000_epic11_shop_settings` + Seed mit jerry’s-Defaults; vorhandene Zeile wird beim Seed nicht überschrieben |
| Cache | Tag `shop-settings`; nach Save/Upload: `updateTag` + `revalidateTag` + `revalidatePath("/", "layout")` |
| Uploads | Vercel Blob (`BLOB_READ_WRITE_TOKEN`, [ADR-0008](./adr/0008-object-storage.md)); ohne Token schlagen Uploads fehl, Lesen fällt auf `/branding/*` zurück |
| Fallbacks | Fehlende/ungültige Logos brechen Checkout, Mail und PDF nicht (Textmarke / Static-Asset / PDF ohne Logo) |
| Absender | Env `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME` hat Vorrang; sonst Anzeigename aus `emailFromName` |
| Rechnung | Env `INVOICE_SELLER_*` überschreibt Aussteller; sonst ShopSettings (Name/Adresse/USt-Id) |

### Runbook: Branding-Upload oder Farben greifen nicht

1. Admin → Einstellungen: Speichern erfolgreich? Kontrast-Warnungen prüfen (AA warnt, blockiert derzeit nicht).
2. Vercel Env: `BLOB_READ_WRITE_TOKEN` für Preview und Production getrennt setzen, wenn neue Logos hochgeladen werden sollen.
3. Storefront hard-refresh / neues Preview-Deploy: Layout-Cache invalidiert sich bei Save; bei Zweifel Production Redeploy.
4. DB: `SELECT shop_name, primary_color, logo_light_url, updated_at FROM shop_settings WHERE id = 'default';`
5. Outbox: Events `shop_settings.*` in `integration_outbox_messages` für Audit.

## Secrets and Access

- Separate credentials for preview, staging, and production.
- Grant each integration only required scopes.
- Restrict production secret and database access to named operators.
- Record access changes and rotate credentials after suspected exposure or staff/access changes.
- Test secret rotation before go-live and document provider-specific steps.

## Observability

Required correlation fields where applicable:

- `requestId`
- `correlationId`
- `orderId`
- `paymentId`
- `bookingId`
- `eventId`
- `provider`

Do not log full addresses, access tokens, payment credentials, label documents, raw session cookies, or unnecessary provider payloads.

Minimum alerts:

- elevated checkout/payment failure rate
- webhook signature or processing failures
- outbox or queue backlog age
- reconciliation mismatch
- negative stock or workshop capacity
- failed label purchase after retries
- database saturation or connection exhaustion
- elevated server error rate and Core Web Vitals regression

## Backup and Recovery

- Enable automated backups and point-in-time recovery for production.
- Document retention and restore ownership.
- Restore into an isolated environment; never overwrite production as the first recovery step.
- Verify schema, representative order/payment/booking records, and application startup after restore.
- Target RPO: 15 minutes. Target RTO: 4 hours.
- Run a restore exercise before go-live and at least twice per year.

## Required Runbooks

Create and test these before their associated feature is enabled:

- failed deployment and application rollback
- database restore
- secret rotation
- provider outage
- successful external payment with incomplete internal finalization
- webhook or outbox backlog
- stuck or expired workshop reservations
- Zettle inventory discrepancy (see runbook below)
- INTERNETMARKE/DHL label purchase failure (see runbook below)
- personal-data incident and data-subject request

Concrete steps for the commerce paths already in production follow below. Features not yet shipped keep the checklist item until an owned runbook exists.

### Runbook: Application rollback (Vercel)

1. Identify the last known-good Production deployment (Vercel → Deployments).
2. **Promote** that deployment (or redeploy the git SHA) — do not “fix forward” with untested commits under incident pressure.
3. Confirm Storefront + Admin login + one catalog page load.
4. Schema: only **expand/contract** rollbacks; never drop columns that the previous release still reads. If a bad migration shipped, restore DB into an isolated clone first (see Backup and Recovery).

### Runbook: PayPal provider outage or sandbox/live misconfig

Symptoms: Checkout zeigt „PayPal nicht eingerichtet“, Create/Capture → 503, erhöhte `paypal_capture_failed` / Checkout-Fehler.

1. Vercel Env (Preview ≠ Production): `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (`sandbox`|`live`), optional `PAYPAL_WEBHOOK_ID`.
2. PayPal Developer Dashboard: App aktiv, Credentials zum Env passend, Webhook-URL `https://<host>/api/webhooks/paypal` erreichbar (Production/Staging).
3. Kundenkommunikation: Vorkasse bleibt nutzbar; PayPal temporär deaktivieren nur bewusst (kein Feature-Flag im Code — ggf. Credentials entfernen → kontrollierte 503).
4. Nach Wiederherstellung: eine Sandbox-/Testzahlung Return-URL **und** Webhook-Pfad prüfen (Inbox-Einträge, Bestellung `paid`).

### Runbook: Extern bezahlt, intern nicht finalisiert

PayPal zeigt Capture/`COMPLETED`, Shop-Bestellung bleibt `pending_payment`.

1. PayPal Order ID aus Kundenmail / PayPal-Dashboard notieren.
2. DB prüfen:
   - `orders` / `order_payments` für die interne Bestellung
   - `webhook_inbox_entries` mit `provider IN ('paypal','paypal_webhook')` und Status `failed`/`received`
3. Erneut finalisieren (idempotent):
   - Admin Bestelldetail → **„Zahlung bei PayPal nachziehen“** **oder**
   - Maintenance: `POST /api/internal/commerce-maintenance` (Feld `paypalReconcile.finalized`) **oder**
   - Return-URL simulieren: `GET /checkout/paypal-rueckkehr?token=<PAYPAL_ORDER_ID>` (Staging) **oder**
   - PayPal Webhook erneut senden (Dashboard → Webhooks → Resend) **oder**
   - Capture-API intern nur über bestehende App-Pfade (kein manuelles Doppel-Capture außerhalb der App).
4. Erwartung: Status `paid`, Capture-Inbox `processed`, Bestätigungsmail (falls noch nicht gesendet). Bei Betrags-Mismatch Logs `paypal_amount_mismatch` — **nicht** manuell auf `paid` setzen ohne Klärung.

Siehe auch [EPIC4_RECONCILIATION.md](./EPIC4_RECONCILIATION.md).

### Runbook: INTERNETMARKE Label-Kauf / Auth fehlgeschlagen

Symptoms: Admin/Command liefert `not_configured` oder `provider_rejected`; Logs mit INTERNETMARKE 401/4xx.

1. Primär: **Admin → Einstellungen → Integrationen → Internetmarke** — Credentials verschlüsselt in DB; Produkt aus Products API wählen (nicht manuell tippen). App-Credentials nur per Env `INTERNETMARKE_CLIENT_ID` / `INTERNETMARKE_CLIENT_SECRET`.
2. Ohne Verbindung/Produkt: Adapter ist `not_configured` — manueller Versand bleibt möglich.
3. **401 beim Token (`POST /user`):** Portokasse „Meine Daten → Geschäftsanwendungen“ freigeben; Entwickler-Portokasse ggf. via `it-csp@deutschepost.de`.
4. Preise: beim Label-Kauf wird der Cent-Preis für das gewählte Produkt aus der Products API aktualisiert.
5. Parameter: Kauf mit `directCheckout=true`. Health: `GET https://api-eu.dhl.com/post/de/shipping/im/v1/`.
6. Nach Erfolg: `shipments.label_external_ref` = `shopOrderId`; PDF-Link ist **ephemer**.
7. Void: `POST /app/retoure`; Status `voided` nur bei Provider-OK.

Siehe [EPIC7_SHIPPING_RETURNS.md](./EPIC7_SHIPPING_RETURNS.md), ADR-0009.

### Runbook: Zettle inventory discrepancy

Symptoms: POS-Verkauf in Zettle, Shop-Bestand unverändert; Sync-Eintrag `failed`; Hinweis unter Integrationen. Oder Online-Verkauf, Zettle-STORE unverändert (`zettle_inventory_pushes.status = failed`).

1. **Admin → Einstellungen → Integrationen → Zettle POS**: Verbindung geprüft? Organisation-UUID sichtbar?
2. API-Key Scopes: `READ:PRODUCT` + `WRITE:PRODUCT` + `READ:PURCHASE` (Key ggf. neu unter [my.zettle.com/apps/api-keys](https://my.zettle.com/apps/api-keys)).
3. Varianten-Mapping: fehlende oder falsche Zuordnung → Sync/Push bleibt `failed`/`skipped` (kein stilles Abschreiben). Mapping setzen, dann Retry.
4. Unterbestand: Shop-Lager prüfen; nach Korrektur Retry — Negativbestand wird bewusst nicht still erzeugt.
5. Idempotenz POS→Shop: `zettle_purchase_syncs.purchase_uuid`. Shop→Zettle: `zettle_inventory_pushes.correlation_id` (`shop_sale:{orderId}` / `shop_return:{orderId}`).
6. Webhook: `POST /api/webhooks/zettle` muss öffentlich HTTPS erreichbar sein (`NEXT_PUBLIC_SITE_URL`); Signing-Key unter Integrationen; bei 401 Signatur prüfen.
7. Cron: `commerce-maintenance` zieht Käufe der letzten 3 Tage und retried pending/failed Inventory-Pushes.
8. Discrepancy vergleicht Shop **available** vs. Zettle STORE (Online-Verkauf reduziert Zettle bei Zahlung).
9. Optional Env `ZETTLE_CLIENT_ID` nur für Attribution; der API-Key selbst liegt verschlüsselt in der DB.

Siehe [EPIC6_ZETTLE_POS.md](./EPIC6_ZETTLE_POS.md).

### Runbook: Webhook- oder Outbox-Backlog

**Webhooks**

1. Logs: `paypal_webhook_invalid_signature`, `paypal_webhook_verify_failed`, `paypal_webhook_processing_failed`.
2. `PAYPAL_WEBHOOK_ID` muss zur Dashboard-Webhook-URL passen; falsche ID → dauerhaft 401.
3. Rate-Limit (In-Memory pro Instance): bei massiven Retries kurz 429 möglich — PayPal retried; Ursache beheben, nicht Limit „ausschalten“.
4. SQL-Orientierung (siehe auch [EPIC1_COMMERCE_CORE.md](./EPIC1_COMMERCE_CORE.md)):

```sql
SELECT provider, status, external_event_id, received_at, processed_at
FROM webhook_inbox_entries
ORDER BY received_at DESC
LIMIT 20;
```

**Outbox / Maintenance**

1. Cron / Manual: `POST /api/internal/commerce-maintenance` mit Bearer `CRON_SECRET` bzw. `COMMERCE_MAINTENANCE_SECRET`.
2. Antwortfelder `expiredReservations`, `outbox.published` prüfen.
3. Backlog:

```sql
SELECT status, event_type, created_at
FROM integration_outbox_messages
ORDER BY created_at DESC
LIMIT 20;
```

4. Wenn Publisher hängt: Secret/Cron auf Production verifizieren (`vercel.json` + GitHub Action laut Epic-1-Doku), dann einen manuellen Maintenance-Call.

Antwort enthält zusätzlich `workshops` (Epic 5 Slice 6):

- `expiredHoldsReleased` — abgelaufene Termin-Holds freigegeben
- `capacityAlerts` — Sessions mit negativen Zählern / Counter≠Buchungssumme / Overcapacity
- `stuckHoldsWithoutExpiry` — `held` ohne `hold_expires_at`
- `incompleteFinalizationsRepaired` — Order `paid`, Buchung noch `held` (nachgezogen)

### Runbook: Stuck or expired workshop reservations

Symptoms: Checkout „Reservierung abgelaufen“, Admin zeigt Holds trotz TTL, Kapazität „voll“ obwohl keine aktiven Buchungen, Logs `workshop_capacity_inconsistency` / `workshop_stuck_holds_without_expiry`.

1. Maintenance anstoßen: `POST /api/internal/commerce-maintenance` (Bearer `COMMERCE_MAINTENANCE_SECRET` oder `CRON_SECRET`).
2. Antwort `workshops.expiredHoldsReleased` und `incompleteFinalizationsRepaired` prüfen.
3. DB-Stichprobe:

```sql
SELECT id, status, hold_expires_at, session_id, order_id
FROM workshop_bookings
WHERE status = 'held'
ORDER BY created_at DESC
LIMIT 20;

SELECT id, title, confirmed_seat_count, held_seat_count, capacity
FROM workshop_sessions
WHERE confirmed_seat_count < 0
   OR held_seat_count < 0
   OR confirmed_seat_count + held_seat_count > capacity;
```

4. Bei Counter-Mismatch: **nicht** blind Zähler setzen — Buchungen (`status IN ('confirmed','attended','no_show','held')`) summieren und mit Admin vergleichen; bei Bedarf Support-Fix mit Audit.
5. Cron-Frequenz: Vercel täglich (`vercel.json`) + GitHub Actions alle 30 Min. (Hobby) — Secrets `COMMERCE_MAINTENANCE_*` prüfen.


1. Restore **niemals** direkt über Production als ersten Schritt — isolierte Instanz / Branch-DB.
2. App gegen Restore-DB starten; Stichproben: letzte bezahlte Bestellung, ein Produkt mit Bestand, Admin-Login.
3. RPO/RTO-Ziele und Übungshäufigkeit: Abschnitt Backup and Recovery.
4. Nach bestätigtem Disaster: Cutover nur mit benanntem Operator und Kommunikationsplan.

## Open Epic 0 Decisions

The architecture is fixed; product choices remain deliberately open until evaluated:

- managed PostgreSQL provider
- ~~object storage provider and retention implementation~~ → decided: Vercel Blob for public branding/media ([ADR-0008](./adr/0008-object-storage.md)); private docs (invoices/labels) still open
- durable queue/workflow provider
- ~~authentication provider or retained Auth.js design~~ → decided: Auth.js retained for admin + customers ([ADR-0005](./adr/0005-customer-authentication.md))
- error tracking, logs, metrics, and alert routing

Each selection requires an ADR before implementation. Product selection must not be hidden inside a feature pull request.
