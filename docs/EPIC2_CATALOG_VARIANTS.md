# Epic 2 — Catalog, Variants, and Inventory

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-2-catalog-variants-and-inventory)

## Status: in Arbeit (Slice 7–8 — Bestand & Kollektions-Filter)

**Branch:** `cursor/epic-2-slice7-8-inventory-filter-21f6`

### Slice 8 (Kollektionen Storefront)

| Thema | Umsetzung |
| --- | --- |
| Filter | „Nur verfügbare Produkte“, Sortierung (Name, Preis) |
| UX | Aktive Filter + Zurücksetzen |

### Slice 7 (Admin Bestand)

| Thema | Umsetzung |
| --- | --- |
| Admin | `/admin/bestand` — `stock_movements` mit SKU, Grund, Bestell-Link |
| Navigation | Sidebar „Bestand“ |

### Slice 6 (Storefront Merchandising)

| Thema | Umsetzung |
| --- | --- |
| Kollektionen | `/kollektionen`, `/kollektionen/[slug]` mit Produktkarten |
| Sale | Produktkarte: Badge + durchgestrichener Listenpreis bei `listPriceGrossCents` |

### Slice 5 (Admin Kollektionen)

| Thema | Umsetzung |
| --- | --- |
| Admin | CRUD Kollektionen, Produkt-Zuordnung per Checkbox, Sortierung Feld |
| Navigation | Link vom Katalog + Vorschau Storefront |

### Slice 4

| Thema | Umsetzung |
| --- | --- |
| Admin | Nicht-Standard-Varianten bearbeiten (SKU, Bezeichnung, Preis, Lager, aktiv/inaktiv) |
| Admin | Standard-Variante weiter nur über Hauptformular |

### Slice 3

| Thema | Umsetzung |
| --- | --- |
| Admin | Tabelle aller Varianten; Formular „Weitere Variante anlegen“ (SKU, Preis, Lager) |
| Storefront PDP | Radio-Auswahl bei mehreren aktiven Varianten; Preis/Lager/Warenkorb pro Auswahl |

### Slice 2 (gemergt)

| Thema | Umsetzung |
| --- | --- |
| PDP / Produktkarten | Preis, Lager, Lieferstatus und Warenkorb über **Default-Variante** + `productVariantId` |
| Admin Bestellung | SKU in Bestandsreservierungen |
| Admin Produkt | Anzeige SKU der Standard-Variante |

### Slice 1 (gemergt)


| Thema | Umsetzung |
| --- | --- |
| Varianten-Schema | `product_variants`, Migration + Default-Variante je Produkt |
| SKU | Global unique; Migration aus `product_number` oder `SKU-<id>` |
| Bestand/Preis | Autoritativ auf Variante; Epic-1-Reservierungen auf `product_variant_id` |
| Collections | Tabellen `collections`, `collection_products` (Admin/UI folgt) |
| Admin | Create/Update synchronisiert Default-Variante + Produkt-Spiegel |
| Warenkorb/Checkout | Positionen an Default-Variante gebunden |

### Exit-Kriterium (Roadmap) — offen

- [ ] Bestehende Produkte ohne Datenverlust (Migration deploy + Verify)
- [ ] Preis/Bestand variantenspezifisch in allen kritischen Pfaden
- [ ] Kein Overselling (Reservierung weiterhin atomar auf Variante)
- [x] Storefront: Variantenwahl + Lieferstatus pro Variante (Slice 3 PDP)
- [ ] Merchandising: Collections-Admin, Filter, Sale-Badges (Filter/Sort Kollektion Slice 8; Sale erledigt)
- [x] Lagerbewegungen nachvollziehbar (Variante/SKU in `/admin/bestand`)

### Ops (nach Merge)

```bash
npm run db:migrate   # Migration 20260807160000_epic2_catalog_variants
```

Production: `prisma migrate deploy` auf Vercel/CI wie üblich.

### Testen

```bash
npm run validate
npm run test:unit -- tests/unit/default-variant-sku.test.ts tests/unit/reservation-line.test.ts
```

### Bewusst später (weitere Epic-2-Slices)

- Mehrere Varianten im Admin-UI, Attribute/Optionen
- Storefront-Variantenpicker
- Collection-Listing, Filter/Sortierung, Sale-Preis-Badges
- Entfernen der Produkt-Spiegelspalten (Contract-Phase)
