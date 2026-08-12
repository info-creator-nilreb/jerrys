# ADR 0010: Categories via collections (Shopify-like assignment)

- Status: Accepted
- Date: 2026-08-12
- Owners: catalog
- Supersedes: [ADR 0004](./0004-product-categories.md) (product↔category membership)

## Context

Operators could assign the same products both to **categories** (nav/browse) and **collections** (merchandising). That duplicates work and diverges from Shopify, where products live in collections and navigation menus point at collections (or other destinations)—not at a second product membership layer.

ADR 0004 correctly kept **categories** as stable browse IA and **collections** as curated groups. The mistake was modeling categories as a second product join (`product_categories`).

## Options considered

1. **Keep dual product assignment** — rejected: double maintenance, inconsistent listings.
2. **Collapse categories into collections** (nav flag on collection only) — rejected for v1: loses `/kategorien/*` URLs, one-level hierarchy, and the explicit “nav vs campaign” split without a menu system.
3. **Category ↔ Collection links; products only in collections** — chosen: Shopify-shaped assignment, keep category routes and hierarchy.

## Decision

1. Products are assigned **only** via `collection_products`.
2. Categories expose products by linking one or more collections (`category_collections` with `sortOrder`).
3. Category listing / nav eligibility = distinct active products in active linked collections.
4. Remove `product_categories` and admin product↔category checkboxes.
5. “Primary category” for PDP breadcrumbs / `/produkte` facets is **derived** (prefer root, then lowest category `sortOrder`) from categories reached through the product’s collections—not stored on the product.
6. Keep `/kategorien/[slug]` and `/kollektionen/[slug]`; collections remain usable in footer merchandising independently of nav.

## Consequences

- Operators maintain product sets once (in collections), then compose nav categories from those sets.
- Empty or inactive linked collections hide a category from nav the same way empty direct memberships did.
- Migrating existing `product_categories` creates/links a collection per affected category and copies memberships.
- CMS block `productCategoryPick` by category slug continues to work via the derived product query.

## Guardrails

- Do not reintroduce direct product↔category writes in admin or APIs.
- Do not require a category for checkout or inventory.
- Collections used only for campaigns need not be linked to any category.

## Revisit when

- A full navigation-menu entity (arbitrary links, not only categories) is required.
- Automated/smart collections ship and should feed categories without manual links.
