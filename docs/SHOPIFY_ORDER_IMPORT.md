# Shopify → jerry's: Bestellimport (historisch)

Einmaliger Import **abgeschlossener Shopify-Bestellungen** als **Gastbestellungen** (`customerId = null`). Kunden sehen sie nach Registrierung mit derselben E-Mail über **Frühere Bestellungen zuordnen** im Kundenportal.

CLI: `npm run orders:import-shopify -- --file ./orders.csv` (Standard: Dry-Run).

## Voraussetzungen

1. **Produkte zuerst importieren** (`npm run catalog:import-shopify`) — Line Items brauchen ein `productId` (SKU-Match oder Legacy-Produkt).
2. Shopify **Orders CSV** exportieren (Admin → Bestellungen → Export).

## Ablauf

1. Dry-Run: Mapping + Validierung + Report (keine DB-Schreibvorgänge).
2. `--apply` auf Staging/Produktion.
3. Kunden: Konto anlegen, E-Mail verifizieren — passende Bestellungen werden **automatisch zugeordnet** (zusätzlich bei jeder Anmeldung). Manuelle Zuordnung bleibt unter `/konto/bestellungen/zuordnen` für Nachziehen.

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

## Admin-UI

Unter **Bestellungen → Shopify-Import** (`/admin/orders/shopify-import`):

1. CSV hochladen oder per Drag-and-Drop ablegen (max. 5 MB).
2. Optionen: Steuersatz, bestehende Import-Bestellungen aktualisieren.
3. **Vorschau prüfen** (Dry-Run inkl. DB-Check).
4. Bestätigen → **Import starten** (schreibt nur bei 0 ungültigen Bestellungen).

Dieselbe Application-Schicht wie die CLI (`importShopifyOrdersFromCsv`).

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
- Keine automatische Konto-Verknüpfung ohne Verifikation — nach bestätigter E-Mail erfolgt Auto-Zuordnung (und erneuter Versuch bei Anmeldung).
- Workshop-/POS-Bestellungen aus anderen Systemen: separat prüfen.

## Nächste Ausbaustufen

1. ~~Admin-UI (wie Produktimport).~~ (umgesetzt unter `/admin/orders/shopify-import`)
2. Shopify GraphQL Admin API statt CSV.
