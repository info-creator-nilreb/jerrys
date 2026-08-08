# Storefront — Brotkrümel & Browse-Kontext

Referenz: [ADR 0004](./adr/0004-product-categories.md), [Epic 10](./EPIC10_PRODUCT_CATEGORIES.md).

## Grundsätze

| Konzept | Kundensicht | Navigation | Breadcrumb-Rolle |
| --- | --- | --- | --- |
| **Kategorien** | Stabile Produktwelt („Kratzbäume“) | **Header** (Primary Nav) | Browse-Pfad & SEO |
| **Kollektionen** | Kampagnen / Kuratierung | **Footer** (Merchandising), nicht parallel zur Haupt-IA | Kontext, wenn Nutzer von dort kommt |
| **Alle Produkte** | Gesamtkatalog | Erster Nav-Link | Fallback ohne Taxonomie |

Es gibt **keine** kombinierte Kette „Kollektion → Kategorie → Produkt“. Es gilt **ein** Pfad pro Ansicht.

## Browse-Kontext (Cookie)

Cookie wird in der **Middleware** aus dem Pfad gesetzt (`/kategorien/[slug]`, `/kollektionen/[slug]`, `/produkte`). Titel auf der PDP kommen aus Produkt-Zuordnungen.

## Matrix — Produktdetailseite (PDP)

| Einstieg (Kontext) | Breadcrumb | Bedingung |
| --- | --- | --- |
| Kollektion **X** | Start → **X** → Produkt | Produkt ist in **X** |
| Kategorie **Y** (Root) | Start → **Y** → Produkt | Produkt ist in **Y** |
| Kategorie **Y** (Unterkategorie) | Start → **Parent** → **Y** → Produkt | Produkt ist in **Y** |
| Katalog `/produkte` | Start → **Alle Produkte** → Produkt | Kontext `catalog` |
| Deep-Link / Suche / extern | Start → (Parent?) → **Primary-Kategorie** → Produkt | Primary gesetzt |
| Deep-Link ohne Primary | Start → **Alle Produkte** → Produkt | Fallback |

**Nicht** verwenden: Index-Crumbs „Kategorien“ / „Kollektionen“ auf der PDP (nur Titel der aktiven Gruppe).

## Matrix — Listings

| Seite | Breadcrumb |
| --- | --- |
| `/kategorien` | Start → Kategorien |
| `/kategorien/[slug]` (Root) | Start → [Kategorie] |
| `/kategorien/[slug]` (Kind) | Start → [Parent] → [Kategorie] |
| `/kollektionen/[slug]` | Start → [Kollektion] |
| `/produkte` | Start → Alle Produkte |

## Navigation (Slice 4)

- Header: `Alle Produkte` + bis zu **6** aktive Root-Kategorien mit mindestens einem sichtbaren Produkt
- Footer: gleiche Shop-Links + optional separate Zeile **Kollektionen** (nur aktive mit Produkten)

Implementierung: [`lib/storefront/shop-nav-links.ts`](../lib/storefront/shop-nav-links.ts), [`lib/storefront/browse-context.ts`](../lib/storefront/browse-context.ts).
