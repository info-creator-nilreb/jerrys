# Shopify → jerry's: Produktimport

Zielbild für einen **einmaligen oder wiederholbaren** Katalog-Import aus Shopify in den Prisma-Katalog (`Product` + `ProductVariant` + `ProductImage`).

CLI-Prototyp: `npm run catalog:import-shopify -- --file ./export.csv` (Standard: Dry-Run).

## Empfohlenes Vorgehen

1. Shopify-Export (Admin → Products → Export) **oder** später GraphQL Admin API.
2. Dry-Run: Mapping + Validierung + Report (Fehler/Warnungen), **keine** DB-Schreibvorgänge.
3. Optionales Mapping-Overlay (Steuer, Kategorien, Lieferzeit) prüfen.
4. Staging-Apply mit `--apply` (idempotent über `slug` / `sku`).
5. Medien nachziehen (URL → Blob); Redirects Handle → `/produkte/[slug]`.
6. Redaktionelle Felder (`featureBullets`, `categoryTag`, Amazon) manuell oder zweiter Pass.

CSV ist Transport, nicht die Architektur. Die Quelle der Wahrheit nach Import ist **dieses** Shop-Modell.

## Feld-Mapping

### Produkt (`products`)

| Shopify (CSV / API) | Ziel | Regel |
| --- | --- | --- |
| `Handle` | `slug` | Lowercase; nur `[a-z0-9-]` (Shopify-Handle ist i. d. R. schon ok). |
| `Title` | `title` | Pflicht; aus erster Zeile des Handles. |
| `Body (HTML)` | `description` | HTML sanitizen (`sanitizeProductDescriptionHtml`). |
| `Vendor` | `Manufacturer.name` | Upsert nach Name; `manufacturerId` setzen. |
| `Type` | Kategorie-Hinweis | Kein Auto-Create; Mapping-Datei `productType → categorySlug` oder Warnung. |
| `Tags` | — / Collections | Kein Tag-Modell. Optional: Mapping Tag → `Collection.slug` oder `featureBullets`. |
| `Published` / `Status` | `isActive` | `active`/`published` → true; sonst false. |
| `SEO Title` | — | **Kein** Produkt-SEO-Feld; Warnung. Meta nutzt `title` + `leadText`. |
| `SEO Description` | `leadText` (optional) | Nur wenn `leadText` leer und Länge ≤ 500; sonst Warnung. |
| erste `Variant SKU` | `productNumber` | Wenn gesetzt; sonst `null` (Default-SKU-Regel greift bei Create). |

Shop-eigene Felder ohne Shopify-Äquivalent (Default / manuell):

- `subtitle`, `categoryTag`, `isBestseller`, `dimensionsText`, `materialText`, `featureBullets`, `showWorkshopCalendar`, Amazon-Felder

### Variante (`product_variants`)

| Shopify | Ziel | Regel |
| --- | --- | --- |
| `Variant SKU` | `sku` | Pflicht für Importzeile; global unique. Leer → Fehler. |
| `Option1/2/3 Value` | `title` | Joined mit ` / `; bei nur `Default Title` → `null` + `isDefault`. |
| `Variant Price` | `priceGrossCents` | Dezimal → Cent; **Annahme: Brutto** (konfigurierbar). |
| — | `priceNetCents` | `netCentsFromGross(gross, taxRatePercent)`. |
| `Variant Compare At Price` | `listPriceGrossCents` / Net | Nur wenn > Verkaufspreis; sonst ignorieren. |
| — | `taxRatePercent` | Default `19` (DE); Override per CLI/Config (`7` \| `19`). |
| `Variant Inventory Qty` | `stockQuantity` **und** `availableQuantity` | Gleich setzen (keine offenen Reservierungen beim Import). |
| — | `deliveryTimeKey` | Default `2-4-werktage` (oder Config). |
| `Variant Grams` | Produkt-`weightText` | Nur von Default-Variante, z. B. `250 g`; strukturiertes Gewicht existiert nicht. |
| Status / Inventory Policy | `isActive` | Produkt inaktiv → Varianten inaktiv; `continue` ohne Stock → Warnung. |

Erste verkaufbare Variante (oder einzige / Default Title) → `isDefault: true`. Weitere → `isDefault: false`, `sortOrder` nach CSV-Reihenfolge.

### Medien (`product_images`)

| Shopify | Ziel | Regel |
| --- | --- | --- |
| `Image Src` | `url` | Zuerst CDN-URL speichern; **Phase 2:** Download → Vercel Blob / Object Storage. |
| `Image Position` | `sortOrder` | 1-basiert → 0-basiert. |
| `Image Alt Text` | `alt` | Fallback: Produkttitel. |
| Position 1 | `isCover` | Genau ein Cover. |
| `Variant Image` | — | Kein Varianten-Medienmodell; Warnung, Bild ans Produkt hängen. |

### Bewusst nicht 1:1

| Shopify | Umgang |
| --- | --- |
| Optionsachsen (Size/Color als Dimensionen) | Flache `title`-Strings; kein Option-Schema. |
| Locations / Multi-Inventory | Ein Bestandswert; Summe oder Primary Location vorher festlegen. |
| Metafields / GTIN / Barcode | Report als `unmapped`; später Schema oder Textfelder. |
| Bundles / Combined listings | Manuell. |
| Shipping profiles | `deliveryTimeKey`-Enum, kein Shopify-Profil. |

## Idempotenz

| Schlüssel | Verhalten |
| --- | --- |
| `slug` (= Handle) | Produkt finden/anlegen. |
| `sku` | Variante finden/anlegen; SKU-Konflikt an **anderem** Produkt → Fehler. |
| Bilder | Bei `--update`: bestehende ersetzen oder nach URL mergen (CLI-Flag). |

Dry-Run schreibt nichts. `--apply` ohne `--update`: bestehende Slugs/SKUs **überspringen**. Mit `--update`: Commerce-Felder und Content überschreiben.

## Admin-UI

Unter **Katalog → Shopify-Import** (`/admin/products/import`):

1. CSV hochladen (max. 5 MB).
2. Steuersatz / Lieferzeit / „Bestehende aktualisieren“ wählen.
3. **Vorschau prüfen** (Dry-Run inkl. DB-Slug-Check).
4. Bestätigen → **Import starten** (schreibt nur bei 0 ungültigen Produkten).

Dieselbe Application-Schicht wie die CLI (`importShopifyProductsFromCsv`).

## CLI

```bash
# Dry-Run (Standard)
npm run catalog:import-shopify -- --file ./shopify-products.csv

# Report speichern
npm run catalog:import-shopify -- --file ./shopify-products.csv --out ./tmp/shopify-import-report.json

# Schreiben (Staging!)
npm run catalog:import-shopify -- --file ./shopify-products.csv --apply --tax 19

# Bestehende aktualisieren
npm run catalog:import-shopify -- --file ./shopify-products.csv --apply --update
```

## Nächste Ausbaustufen

1. Mapping-JSON: `productType`/`tags` → Categories/Collections.
2. Medien-Pipeline nach Blob (ADR 0008).
3. Shopify GraphQL statt CSV (gleiche Mapper-Schicht).
4. Redirect-Tabelle alter Storefront-URLs.
