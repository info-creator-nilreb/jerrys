# Epic 10 — Product Categories and Storefront Navigation

Referenz: [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-10-product-categories-and-storefront-navigation)

## Motivation (UX)

Storefront primary navigation should follow **customer mental models** (product types, rooms, use cases), not internal entities (“Produkte”, “Kollektionen”). Collections stay valuable for **merchandising**; categories provide **stable browse paths**. Interim navigation uses `Shop` + active collection titles until this epic ships ([`lib/storefront/shop-nav-links.ts`](../lib/storefront/shop-nav-links.ts)).

## Dependencies

| Epic | Warum |
| --- | --- |
| Epic 2 | Varianten, Produktkarten, Filter/Sortierung, Collections |
| Epic 8 (teilweise) | Responsive Listing-UX, Performance-Budgets — Kategorieseiten nutzen dieselben Patterns |

## Nicht Ziele

- Vollständiger PIM / unbegrenzte Attribut-Facetten
- Collections abschaffen oder mit Kategorien vermischen
- Mehrsprachige Kategorie-Slugs (Roadmap: DE-only bis explizit freigegeben)

## Slice 1 — ADR und Datenmodell

| Thema | Umsetzung |
| --- | --- |
| ADR | `docs/adr/0004-product-categories.md` — Taxonomie vs. Collections, Primary category, URL-Konvention |
| Schema | `categories` (slug unique, title, description, sortOrder, isActive, optional `parentId` für max. 1 Verschachtelung in v1) |
| Zuordnung | `product_categories` (productId, categoryId, isPrimary) |
| API | `features/catalog` — `listActiveCategoriesForNav`, `listActiveCategoryTreeForNav`, `listActiveProductsByCategorySlug` |

**Exit Slice 1:** Migration deploybar; kein Storefront-UI-Zwang. **Status:** umgesetzt (`20260808142000_epic10_product_categories`).

## Slice 2 — Admin

| Thema | Umsetzung |
| --- | --- |
| Listen | `/admin/categories` — sortierbar, aktiv/inaktiv |
| Formular | Anlegen/Bearbeiten, Slug-Validierung |
| Produkt | Kategorie-Zuordnung am Produkt (Primary + optional weitere) |
| Nav | Feld „In Hauptnavigation anzeigen“ oder implizit über `isActive` + Produktanzahl |

**Exit Slice 2:** Operator kann Katalog ohne SQL strukturieren.

## Slice 3 — Storefront Listings

| Thema | Umsetzung |
| --- | --- |
| Routen | `/kategorien` (optional Index), `/kategorien/[slug]` |
| Inhalt | Produktkarten, Filter „nur verfügbar“, Sortierung wie `/produkte` |
| Leer | Inaktive/leere Kategorie → 404 oder nicht verlinkt (Nav-Regel) |
| Breadcrumbs | Start → Kategorie → (Produkt) |

**Exit Slice 3:** Deep-Link und SEO-Title pro Kategorie.

## Slice 4 — Navigation

| Thema | Umsetzung |
| --- | --- |
| Header | `buildStorefrontShopNavLinks` erweitern oder ersetzen: aktive Top-Level-Kategorien (+ ggf. „Alle Produkte“) |
| Mobile | Bestehendes Burger-Menü befüllen |
| Collections | Weiterhin nur **aktive** Kollektionen als Zusatzlinks oder nur Footer/Home — Product Owner Entscheid in ADR |
| Footer | Gleiche Sichtbarkeitslogik wie Header |

**Exit Slice 4:** Kein generischer „Kollektionen“-Index in der Nav ohne veröffentlichte Inhalte (bestehende Regel bleibt).

## Slice 5 — Migration, Tests, Ops

| Thema | Umsetzung |
| --- | --- |
| Migration | Optional eine Default-Kategorie; bestehende URLs `/produkte`, `/kollektionen/*` unverändert |
| Tests | Unit: Nav-Sichtbarkeit; Integration: Slug-Routing, inactive category |
| Docs | REQUIREMENTS-Abschnitt Kategorien; DESIGN_SYSTEM Hinweis Primary Nav |

**Exit Epic 10:** Roadmap-Exit-Kriterien in PLATFORM_ROADMAP erfüllt.

## Risiken

| Risiko | Mitigation |
| --- | --- |
| Zu viele Top-Level-Links | Max. Anzahl in Nav (z. B. 6) + „Alle Produkte“ |
| Doppelte IA mit Collections | ADR: klare Rollen (Browse vs. Campaign) |
| SEO-Duplicate mit `/produkte` | Canonical-Strategie pro Listing in Slice 3 |

## Rollback

- Feature-Flag oder Deploy-Revert; Down-Migration nur wenn keine produktiven Zuordnungen existieren.
