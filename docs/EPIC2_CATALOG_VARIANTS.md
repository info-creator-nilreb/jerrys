# Epic 2 — Catalog, Variants, and Inventory

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-2-catalog-variants-and-inventory)

## Status: in Arbeit (Slice 1 — Datenmodell + Reservierungen)

**Branch:** `cursor/epic-2-catalog-variants-21f6`  
**ADR:** [0003-catalog-variants-and-collections.md](./adr/0003-catalog-variants-and-collections.md)

### Slice 1 (dieser Stand)

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
- [ ] Storefront: Variantenwahl + Lieferstatus pro Variante
- [ ] Merchandising: Collections-Admin, Filter, Sale-Badges
- [ ] Lagerbewegungen nachvollziehbar (Variante in Admin-Ansicht)

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
