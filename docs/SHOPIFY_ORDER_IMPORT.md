# Shopify → jerry's: Bestellimport (historisch)

Einmaliger Import **abgeschlossener Shopify-Bestellungen** als **Gastbestellungen** (`customerId = null`). Kunden sehen sie nach Registrierung mit derselben E-Mail über **Frühere Bestellungen zuordnen** im Kundenportal.

CLI: `npm run orders:import-shopify -- --file ./orders.csv` (Standard: Dry-Run).

## Voraussetzungen

1. **Produkte zuerst importieren** (`npm run catalog:import-shopify`) — Line Items brauchen ein `productId` (SKU-Match oder Legacy-Produkt).
2. Shopify **Orders CSV** exportieren (Admin → Bestellungen → Export).

## Ablauf

1. Dry-Run: Mapping + Validierung + Report (keine DB-Schreibvorgänge).
2. `--apply` auf Staging/Produktion.
3. Kunden: Konto anlegen, E-Mail verifizieren, unter `/konto/bestellungen/zuordnen` zuordnen.

## Feld-Mapping (Auszug)

| Shopify | Ziel | Regel |
| --- | --- | --- |
| `Name` (`#1042`) | `orderNumber` | `SHOPIFY-1042` |
| `Id` | `idempotencyKey` | `shopify-order:{Id}` — idempotenter Re-Import |
| `Email` | `email` | lowercase; **Pflicht** für spätere Zuordnung |
| `Financial Status` | `status` | paid+fulfilled → `completed`, refunded → `refunded`, … |
| `Fulfillment Status` | `fulfillmentStatus` | fulfilled → `delivered`, … |
| `Created at` | `createdAt` | Originaldatum |
| Summen / Adressen | Order-Felder | Cent-Umrechnung; fehlende Adressen → Platzhalter + Warnung |
| `Lineitem sku` | Produkt-Lookup | Match über `ProductVariant.sku`; sonst Legacy-Produkt |
| Positionstitel/Preis | `OrderItem` Snapshots | Immer gespeichert |

Importierte Bestellungen:

- **Kein** Bestandsabzug, **keine** E-Mails, **keine** PayPal-Anbindung
- `customerId` bleibt `null` bis zur Kunden-Zuordnung
- Audit: `order.placed` mit `metadata.source = shopify_import`

## Legacy-Produkt

Positionen ohne SKU-Match werden dem inaktiven Platzhalter-Produkt `shopify-import-legacy-item` zugeordnet. Titel und Preis bleiben in den Snapshots sichtbar.

## CLI

```bash
# Dry-Run
npm run orders:import-shopify -- --file ./shopify-orders.csv

# Report speichern
npm run orders:import-shopify -- --file ./shopify-orders.csv --out ./tmp/shopify-orders-report.json

# Schreiben
npm run orders:import-shopify -- --file ./shopify-orders.csv --apply

# Re-Import / Korrektur
npm run orders:import-shopify -- --file ./shopify-orders.csv --apply --update
```

## Grenzen

- CSV enthält keine vollständige Refund-Historie — Teilerstattungen werden vereinfacht.
- Keine automatische Konto-Verknüpfung (bewusst: Verifikation erforderlich).
- Workshop-/POS-Bestellungen aus anderen Systemen: separat prüfen.

## Nächste Ausbaustufen

1. Admin-UI (wie Produktimport).
2. Auto-Zuordnung direkt nach E-Mail-Verifikation.
3. Shopify GraphQL Admin API statt CSV.
