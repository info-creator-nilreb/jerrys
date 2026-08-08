# Epic 8 — Storefront & Admin Completion (Agent-Handoff)

**Zielgruppe:** neuer Cloud-/Cursor-Agent  
**Basis-Branch:** `main` (Stand nach Epic 10 Abschluss, PR #30)  
**Roadmap:** [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md#epic-8-storefront-and-admin-completion)

---

## Epic-Nummern nicht verwechseln

| Bezeichnung | Dokument | Inhalt | Status |
| --- | --- | --- | --- |
| **Epic 8 (dieses Handoff)** | `PLATFORM_ROADMAP.md` | Search, Filter/Sort, Cart/Checkout-UX, Legal/Versand, Admin-Bedienbarkeit | **Erledigt** (PR #32) |
| „Epic 8 SEO“ | `DELIVERY_PLAN_PHASE2.md` | Sitemap, robots, JSON-LD, OG, `llms.txt`, Lighthouse CI | **Weitgehend erledigt** — nur Lücken/Regression, kein Neustart |

---

## Was auf `main` bereits steht (Kontext)

| Bereich | Erledigt (Epic / PR) |
| --- | --- |
| Katalog, Varianten, Kollektionen, Filter/Sort auf **Kollektion** + **Kategorie** | Epic 2 |
| Kategorien Admin + Storefront + Nav + Breadcrumbs | Epic 10 (#22–#27, #30) |
| Mobile UX Admin-Drawer, Cart-Touch, Toolbar-Inputs | PR #28 |
| Produktbild löschen (Form Action) | PR #29 |
| Promotions / Rabattcode im Checkout | Admin + `checkout-discount-panel` |
| PayPal + Vorkasse Checkout | Epic 9 (Delivery Plan) |
| SEO-Baseline | Delivery Plan Epic 8 (s. Tabelle oben) |

**Epic 10** ist abgeschlossen ([EPIC10_PRODUCT_CATEGORIES.md](./EPIC10_PRODUCT_CATEGORIES.md), Slice 5 in #30).

---

## Roadmap-Exit Epic 8 (PLATFORM)

Auszug — vollständig in `PLATFORM_ROADMAP.md`:

- Kunde: **suchen, filtern, sortieren**, Varianten wählen, **responsiver Warenkorb**
- Kunde: **Gutscheine** anwenden, **Versandkosten** vor Zahlung verstehen
- Kunde: konsistente **Rechts-, Versand-, Retouren**-Infos
- Admin: zentral Katalog, Kunden, Bestellungen, Zahlung, Versand bedienen
- **Exit:** kritische Flows a11y/mobile/consent/Performance-Budgets ([QUALITY_GUARDRAILS.md](./QUALITY_GUARDRAILS.md))

**Nicht im Repo (größere Roadmap, nicht Teil des ersten Epic-8-Schnitts):** Workshops, Zettle, Kundenkonten — siehe `PLATFORM_ROADMAP` Epic 3–6. Nicht als Blocker für Listing/Search-UX missverstehen.

---

## Konkrete Lücken (priorisiert)

1. ~~**`/produkte` ohne Filter/Sort**~~ — **erledigt** Slice 1: gleiche URL-Params/`CollectionCatalogToolbar` wie Kategorie/Kollektion.
2. ~~**Keine Storefront-Suche**~~ — **erledigt** Slice 3: `/produkte?q=` (Titel/Subtitle/Slug), Header-Dialog + Formular; **Typeahead** via `GET /api/storefront/product-suggest`.
3. ~~**Mobile Filter-Sheet**~~ — **erledigt** Slice 2 in `CollectionCatalogToolbar` (Trigger `max-md`, Bottom-Sheet, Chips).
4. ~~**Listing-UX vereinheitlichen**~~ — **erledigt** für `/produkte`, `/kategorien/[slug]`, `/kollektionen/[slug]` (Toolbar, aktive Filter, Zurücksetzen).
5. **Performance / CI** — Lighthouse bleibt bewusst `continue-on-error` + soft `warn`-Schwellen (Runner-Flake); kein hartes Gate in Slice 5.
6. **Admin „Completion“** — kein zentraler Integrations-/Fehler-Hub; eher Slice 2–3 (Bestellungen, Versand, Promotions schon da). — bewusst später / nicht Blocker für Epic-8-Listing.

---

## Vorgeschlagene Slices (für PRs)

Branch-Prefix: `cursor/epic8-slice<N>-<kurzname>-21f6`

### Slice 1 — Listing-Parität `/produkte`

- `searchParams` `sort` / `verfuegbar` wie Kategorie/Kollektion
- `filterAndSortCollectionProducts` / `parseCollectionSort` wiederverwenden ([`lib/catalog/collection-storefront-sort.ts`](../lib/catalog/collection-storefront-sort.ts))
- Toolbar + „X von Y“ + Link Filter zurücksetzen
- Unit-Tests für Sort/Filter-Logik falls noch Lücken

**Exit:** `/produkte`, `/kategorien/[slug]`, `/kollektionen/[slug]` gleiches Filterverhalten.

### Slice 2 — Mobile Filter-Sheet (Shopify-like)

- Trigger „Filter & Sortierung“ auf `max-md`; Sheet/Drawer mit gleichen Controls
- Fokus, Escape, Body-Scroll-Lock; Touch ≥44 px ([DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md))
- Optional: Chips für aktive Filter oberhalb Grid

**Exit:** [MOBILE_UX_AUDIT.md](./MOBILE_UX_AUDIT.md) Filter-Zeile abhaken.

### Slice 3 — Storefront-Suche (Minimal v1)

- Header oder `/produkte`: Query `q` (min. 2 Zeichen), serverseitig auf aktive Produkte (Titel, ggf. Subtitle/Slug)
- Kein Facetten-PIM ([adr/0004](./adr/0004-product-categories.md))
- Leerer Treffer + a11y

**Exit:** Roadmap-Story „search“ minimal erfüllt ohne Elasticsearch.

### Slice 4 — Checkout: Versand & Legal sichtbar

- Audit: Versandkosten vor PayPal, AGB/Widerruf-Links, Promotion-Fehlerzustände
- Abgleich `REQUIREMENTS.md` Checkout + `components/storefront/checkout-form.tsx`
- Kleine UX-Fixes only — keine Payment-Logik umbauen
- **Umgesetzt:** Rechtliche Zustimmung vor Bestell-CTA; Versandzeile mit Land, Free-Shipping-Hinweis, Link `/versand`; Promo-Leer-/Systemfehler; Legal-Links `target=_blank`

### Slice 5 — Tests, Ops, Doku

- E2E: Listing-Filter + Suche (+ Typeahead) in `tests/e2e/catalog-filter.spec.ts`
- Status-Tabelle unten aktualisiert
- Lighthouse: `continue-on-error` + soft warns beibehalten (siehe Lücke 5)

---

## Schlüsseldateien

| Thema | Pfade |
| --- | --- |
| Listings | `app/(storefront)/produkte/page.tsx`, `kategorien/[slug]/page.tsx`, `kollektionen/[slug]/page.tsx` |
| Toolbar | `components/storefront/collection-catalog-toolbar.tsx` |
| Sort/Filter | `lib/catalog/collection-storefront-sort.ts` |
| Suche | `storefront-product-search.ts`, `storefront-product-suggest(-shared).ts`, `GET /api/storefront/product-suggest`, `storefront-search-form.tsx`, `storefront-header-search.tsx` |
| Produktliste | `lib/catalog/queries.ts` (`listActiveProductsForStorefront`) |
| Header/Nav | `components/storefront/site-header.tsx`, `storefront-shop-nav.tsx` |
| Design | `docs/DESIGN_SYSTEM.md`, `docs/MOBILE_UX_AUDIT.md` |
| Qualität | `docs/QUALITY_GUARDRAILS.md`, `.github/workflows/ci.yml`, `lighthouserc.json` |

---

## Konventionen (Repo)

- Primärfarbe Grün: `app/globals.css` / `AGENTS.md`
- Icons: `lucide-react`
- Commits: conventional (`feat`, `fix`, …)
- PRs: Draft → CI grün → ready → merge (Nutzerpräferenz)
- Next.js: Guides unter `node_modules/next/dist/docs/` bei API-Fragen

---

## Copy-Paste — Aufgabe für neuen Agenten

```
Epic 8 (PLATFORM_ROADMAP: Storefront and Admin Completion) auf main umsetzen.

Lies zuerst:
- docs/EPIC8_STOREFRONT_COMPLETION.md (dieses Handoff)
- docs/PLATFORM_ROADMAP.md#epic-8-storefront-and-admin-completion
- docs/MOBILE_UX_AUDIT.md (Filter-Sheet offen)

Beginne mit Slice 1: /produkte Filter & Sortierung wie Kategorie/Kollektion
(CollectionCatalogToolbar, URL-Params, Zurücksetzen). Dann Slice 2 Mobile
Filter-Sheet. SEO-Epic aus DELIVERY_PLAN_PHASE2 ist separat — nicht duplizieren.

Branch: cursor/epic8-slice1-produkte-filter-21f6
Tests: npm run validate oder typecheck + test:unit + relevante E2E.
Antworten auf Deutsch.
```

---

## Nach Slice 5

- Weiter mit **Epic 9 Hardening & Go-Live**: [EPIC9_HARDENING_GO_LIVE.md](./EPIC9_HARDENING_GO_LIVE.md) (Slice 1: PayPal-Webhooks)
- Delivery Plan Epic 10 Security / Workshops später
- Epic-8-Dokument: Slice-Status in Tabelle unten pflegen

### Slice-Status

| Slice | Status |
| --- | --- |
| 1 Listing `/produkte` | erledigt (Branch `cursor/epic8-slice1-produkte-filter-21f6`) |
| 2 Mobile Filter-Sheet | erledigt (gleiche PR: `CollectionCatalogToolbar`) |
| 3 Storefront-Suche | erledigt (`q` + Typeahead-Suggest-API, Header + `/produkte`) |
| 4 Checkout Legal/Versand | erledigt (UX: Consent vor CTA, Versand sichtbar, Promo-Fehler) |
| 5 Tests/Ops | erledigt (E2E Filter/Suche/Typeahead; Lighthouse soft + `continue-on-error`) |
