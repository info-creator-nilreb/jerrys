# Mobile UX — Audit (Benchmark: Shopify)

Stand: Epic-Nacharbeit nach Storefront-IA (Kategorien/Kollektionen). Ziel: **mobile-first Storefront**, **Admin nutzbar ab Tablet/Smartphone** (DESIGN_SYSTEM: Touch ≥44×44 px wo praktikabel).

## Storefront (Shop)

| Bereich | Shopify-typisch | Stand jerry's | Maßnahme |
| --- | --- | --- | --- |
| Header | Hamburger + Logo + Cart; kompakt | Burger-Nav ab `md`, Cart rechts | **Erledigt:** Cart/±/Schließen `min-h-11`; Flyout volle Breite ≤sm |
| Navigation | Menü-Drawer, Fokus/Scroll-Lock | Vorhanden (`StorefrontShopNav`) | **Erledigt:** Drawer-Links `min-h-11` |
| Katalog-Toolbar | Filter/Sort als Sheet oder klare Controls | Select + Checkbox; mobil Sheet | **Erledigt:** Select `text-base` mobil; Checkbox-Zeile `min-h-11`; **Filter-Sheet** (`max-md`, Escape/Scroll-Lock, Chips) |
| PDP | Preis + ATC sticky unten optional | Panel unter Galerie | OK; ATC-Form prüfen (Touch) |
| Cart | Drawer volle Breite mobil | Flyout `max-w-md`, full height | **Erledigt:** `max-w-none` ≤sm, Safe-Area Footer |
| Checkout | Einspaltig, große Felder | Responsive Grids | Bereits `sm:grid-cols-2`; Inputs 16 px |
| Footer | Gestapelte Links | Wrap, ausreichend Abstand | OK |

## Admin (Shopify Admin)

| Bereich | Shopify-typisch | Stand vor Fix | Maßnahme |
| --- | --- | --- | --- |
| Navigation | **Drawer** auf Mobile, Sidebar ab Tablet | Sidebar immer sichtbar (frisst ~4–15 rem) | **Erledigt:** Mobile Drawer `<lg`, Hamburger in TopBar |
| TopBar | Suche + Aktionen, kompakt | Suche + Glocke | **Erledigt:** Menü-Button; Suche/Glocke `min-h-11`, Input `text-base` mobil |
| Tabellen | Card-Liste oder horizontal scroll | Cards `<md`, Tabelle `md+` | **Erledigt:** Admin-Index Cards (Livegang-Paket) |
| Formulare | Sticky Save unten **volle Breite** mobil | Dock mit Sidebar-Offset | **Erledigt:** Dock `left-0` auf Mobile + Safe-Area |
| Login | Vollbreite Form | Grid Hero + Form | Bereits responsive |

## Bewusst nicht in v1

- ~~Admin-Index **Card-Layout** statt Tabellen~~ (**Erledigt** Final-Go-Live-Paket)
- ~~Storefront **Filter-Sheet** statt Inline-Toolbar~~ (**Erledigt** Epic 8 Slice 2)
- PDP **sticky ATC-Bar** (nur wenn Conversion-Test es verlangt)

## Review-Checkliste ( wiederholen bei neuen Views )

- [x] Primäraktion auf Mobile ohne Zoom erreichbar (Font ≥16 px in Inputs)
- [x] Interaktive Flächen ~44×44 px (Storefront Cart/Nav; Admin TopBar/Nav)
- [x] Kein horizontaler „Layout-Bruch“ außer bewusst scrollbare Detail-Tabellen
- [x] Fokus sichtbar, Escape schließt Overlays
- [x] Safe-Area unten bei sticky Docks (`env(safe-area-inset-bottom)`)

Implementierung: Branch `cursor/mobile-ux-shopify-audit-21f6` + `cursor/final-go-live-package-3106`.
