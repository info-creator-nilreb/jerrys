# Epic 6 — Zettle POS

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-6-zettle-pos)

## Zielbild

Der Shop bleibt **Source of Truth** für Bestand. Zettle ist ein **downstream POS-Kanal**: Käufe an der Kasse reduzieren den Shop-Bestand über idempotente Stock-Movements. Varianten werden manuell auf Zettle-Produkte gemappt. Sync-Fehler sind im Admin sichtbar und erneut anstoßbar.

## Abgrenzung

| Thema | Hinweis |
| --- | --- |
| `/admin/einstellungen/integrationen` | Zettle-API-Key verbinden (analog Instagram/Internetmarke) |
| Bestand | Nur Abbuchung aus POS-Käufen; Zettle überschreibt Shop-Bestand nie |
| Katalog | Kein automatisches Pushen von Shop-Produkten nach Zettle (v1) |
| Webhooks/Pusher | Follow-up (Slice 3+); v1 = Pull-Sync aus Admin / Maintenance |

## Auth (Private Integration)

- Assertion Grant mit API-Key (JWT) aus [my.zettle.com/apps/api-keys](https://my.zettle.com/apps/api-keys)
- Scopes: `READ:PRODUCT`, `READ:PURCHASE` (WRITE:PRODUCT erst bei späteren Inventory-Push)
- API-Key verschlüsselt in DB (`INTEGRATIONS_ENCRYPTION_KEY` / `AUTH_SECRET`)
- Optional `ZETTLE_CLIENT_ID` in Env für Attribution (`X-iZettle-Application-Id`)

## Vorgeschlagene Slices

1. **Verbindung + Mapping + Pull-Sync (dieser Schnitt):** `ZettleConnection`, Produkt-Mapping, Admin-Panel unter Integrationen, manueller Kauf-Sync mit Idempotenz und `pos_sale`/`pos_refund`-Movements.
2. **Maintenance-Cron:** periodischer Purchase-Pull in `commerce-maintenance`.
3. **Pusher/Webhooks:** Near-realtime `PurchaseCreated` + Inbox-Idempotenz.
4. **Discrepancy-Report:** Admin-Übersicht Shop vs. Zettle Inventory (optionaler Inventory-API-Read).

## Exit-Kriterien (Epic)

1. Zettle kann Shop-Bestand nicht still überschreiben.
2. POS-Käufe erzeugen höchstens einmal Stock-Movements (Idempotenz über `purchaseUUID`).
3. Mapping- und Sync-Fehler sind im Admin sichtbar und retrybar.
4. Negative/konfliktäre Bestände erzeugen actionable Alerts (fehlgeschlagene Sync-Einträge), keine stillen Korrekturen.

## Nicht-Ziele (v1)

- Multi-Merchant / Partner-OAuth-Code-Grant als Pflichtweg
- Automatischer Katalog-Export Shop → Zettle
- Zettle als Inventory-SoT
