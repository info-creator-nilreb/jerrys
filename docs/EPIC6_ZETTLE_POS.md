# Epic 6 — Zettle POS

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-6-zettle-pos)

## Zielbild

Der Shop bleibt **Source of Truth** für Bestand. Zettle ist ein **POS-Kanal mit bidirektionalen Verkaufs-Deltas**:

| Richtung | Trigger | Wirkung |
| --- | --- | --- |
| Zettle → Shop | POS-Kauf / Refund (`PurchaseCreated`, Pull-Sync) | Shop `stock` + `available` idempotent anpassen |
| Shop → Zettle | Online-Zahlung (`paid`) | Zettle STORE→SOLD für gemappte Varianten |
| Shop → Zettle | Storno (nach Zahlung) / Retoure | Zettle SOLD→STORE |

Varianten werden manuell gemappt. Sync-/Push-Fehler sind im Admin sichtbar und über den Maintenance-Cron erneut anstoßbar. Zettle setzt den Shop-Bestand **nie absolut** (kein Overwrite).

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| `/admin/einstellungen/integrationen` | Zettle-API-Key verbinden (analog Instagram/Internetmarke) |
| Bestand | Deltas aus Verkäufen/Retouren; kein Katalog-Push Shop→Zettle (v1) |
| Webhooks/Pusher | `PurchaseCreated` → `/api/webhooks/zettle`; Cron-Pull als Fallback |
| Inventory-Push | Ledger `zettle_inventory_pushes` + `commerce-maintenance` Retry |

## Auth (Private Integration)

- Assertion Grant mit API-Key (JWT) aus [my.zettle.com/apps/api-keys](https://my.zettle.com/apps/api-keys)
- Scopes: `READ:PRODUCT`, `WRITE:PRODUCT` (Inventory lesen/schreiben), `READ:PURCHASE`
- API-Key verschlüsselt in DB (`INTEGRATIONS_ENCRYPTION_KEY` / `AUTH_SECRET`)
- Optional `ZETTLE_CLIENT_ID` in Env für Attribution (`X-iZettle-Application-Id`)
- Webhook: `POST /api/webhooks/zettle` (HMAC über `timestamp.payload`, Signing-Key aus Subscription)

## Vorgeschlagene Slices

1. **Verbindung + Mapping + Pull-Sync:** `ZettleConnection`, Produkt-Mapping, Admin-Panel unter Integrationen, manueller Kauf-Sync mit Idempotenz und `pos_sale`/`pos_refund`-Movements. **Status:** umgesetzt.
2. **Maintenance-Cron:** periodischer Purchase-Pull in `commerce-maintenance`. **Status:** umgesetzt.
3. **Pusher/Webhooks:** Near-realtime `PurchaseCreated` + Inbox-Idempotenz (`/api/webhooks/zettle`). **Status:** umgesetzt.
4. **Discrepancy-Report:** Admin-Button „Bestands-Abweichungen prüfen“ (Shop `available` vs. Zettle STORE). **Status:** umgesetzt.
5. **Shop→Zettle Inventory-Push:** Online-Verkauf/Storno/Retoure → Inventory-API (STORE↔SOLD), Ledger + Cron-Retry. **Status:** umgesetzt.

## Exit-Kriterien (Epic)

1. Zettle kann Shop-Bestand nicht still überschreiben.
2. POS-Käufe erzeugen höchstens einmal Stock-Movements (Idempotenz über `purchaseUUID`).
3. Online-Verkäufe gemappter Varianten reduzieren Zettle-STORE höchstens einmal (Idempotenz über `shop_sale:{orderId}` / `externalUuid`).
4. Mapping- und Sync-Fehler sind im Admin sichtbar und retrybar.
5. Negative/konfliktäre Bestände erzeugen actionable Alerts (fehlgeschlagene Sync-/Push-Einträge), keine stillen Korrekturen.

## Nicht-Ziele (v1)

- Multi-Merchant / Partner-OAuth-Code-Grant als Pflichtweg
- Automatischer Katalog-Export Shop → Zettle
- Zettle als Inventory-SoT / absolutes Setzen von Shop-Beständen aus Zettle
- Push bei reiner Reservierung vor Zahlung (erst bei `paid`)
