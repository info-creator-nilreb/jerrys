# Shopify → jerry's: Bestellimport (historisch)

Einmaliger Import **abgeschlossener Shopify-Bestellungen** als **Gastbestellungen** (`customerId = null`). Kunden sehen sie nach Registrierung mit derselben E-Mail über **Frühere Bestellungen zuordnen** im Kundenportal.

CLI: `npm run orders:import-shopify -- --file ./orders.csv` (Standard: Dry-Run).

## Voraussetzungen

1. **Produkte zuerst importieren** (`npm run catalog:import-shopify`) — Line Items werden dem Katalog zugeordnet (siehe Matching unten).
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
| `Lineitem sku` | Produkt-Lookup | Priorität 1: exakte `ProductVariant.sku` (Shopify-SKU oder Import-SKU aus Produktimport) |
| `Lineitem name` | Produkt-Lookup | Priorität 2: „Produkttitel - Variante“ → Titel + Variantentitel; Priorität 3: nur Produkttitel → Default-Variante **nur wenn eindeutig** |
| Positionstitel/Preis | `OrderItem` Snapshots | Immer gespeichert |

### Katalog-Matching (Reihenfolge)

1. **SKU** — Shopify-SKU oder beim Produktimport generierte Handle-SKU.
2. **Titel + Variante** — `Lineitem name` wird am ersten ` - ` getrennt; case-insensitive Lookup.
3. **Produkttitel (Default)** — nur wenn genau eine Default-Variante mit diesem Titel existiert.
4. **Legacy** — mehrdeutiger Titel oder kein Treffer → Platzhalter-Produkt `shopify-import-legacy-item` (Snapshots bleiben vollständig).

Dry-Run und Admin-Vorschau zeigen Warnungen bei Titel-Matching und Legacy-Fällen.

Importierte Bestellungen:

- **Kein** Bestandsabzug, **keine** E-Mails, **keine** PayPal-Anbindung
- `customerId` bleibt `null` bis zur Kunden-Zuordnung
- Audit: `order.placed` mit `metadata.source = shopify_import`

## Legacy-Produkt

Positionen ohne eindeutiges Katalog-Matching (SKU, Titel+Variante oder eindeutiger Produkttitel) werden dem inaktiven Platzhalter-Produkt `shopify-import-legacy-item` zugeordnet. Titel und Preis bleiben in den Snapshots sichtbar.

## Admin-UI

Unter **Einstellungen → Importe → Bestellungen** (`/admin/einstellungen/importe/bestellungen`):

1. CSV hochladen oder per Drag-and-Drop ablegen (max. 25 MB — bei größeren Exporten CLI nutzen).
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

- CSV-Upload im Admin: max. **25 MB** (Bestell-Exporte mit vielen Positionen können groß werden). Darüber: CLI `npm run orders:import-shopify -- --file ./orders.csv`
- Semikolon- oder Komma-Trennung wird automatisch erkannt (Excel/DE).
- CSV enthält keine vollständige Refund-Historie — Teilerstattungen werden vereinfacht.
- Keine automatische Konto-Verknüpfung ohne Verifikation — nach bestätigter E-Mail erfolgt Auto-Zuordnung (und erneuter Versuch bei Anmeldung).
- Workshop-/POS-Bestellungen aus anderen Systemen: separat prüfen.

## Nächste Ausbaustufen

1. ~~Admin-UI (wie Produktimport).~~ (umgesetzt unter `/admin/einstellungen/importe/bestellungen`)
2. Shopify GraphQL Admin API statt CSV.
