# ADR 0004: Product categories (browse taxonomy)

## Status

**Superseded** by [ADR 0010](./0010-category-via-collections.md) for product assignment (categories now compose collections). Category entity, hierarchy, and `/kategorien/*` URLs remain.

## Context

Storefront navigation should reflect **customer browse paths** (product types, rooms, use cases), not only internal entities (“Produkte”, “Kollektionen”). **Collections** remain for **campaigns and merchandising** (Epic 2). We need a separate **category taxonomy** with stable URLs without replacing collections or the existing `/produkte` listing.

Epic 10 defines v1 scope: flat or **one level** of parent/child categories, primary category per product, routes `/kategorien/[slug]` in later slices.

## Options considered

1. **Reuse collections as categories** — rejected: mixes campaign lifecycle with stable IA; operators already use collections for time-bound groups.
2. **Tags only (no hierarchy)** — deferred: roadmap allows optional `parentId` for one nesting level in v1.
3. **Dedicated `categories` + `product_categories`** — chosen: mirrors proven `collections` / `collection_products` pattern; clear separation of concerns.

## Decision

1. **`categories` table**: `slug` (unique), `title`, optional `description`, `sortOrder`, `isActive`, optional `parentId` (self-reference, max depth enforced in application: parent must be root).
2. **`product_categories`**: many-to-many `productId` + `categoryId`, `isPrimary` boolean; at most **one primary category per product** (partial unique index on `product_id` where `is_primary = true`).
3. **URLs**: Storefront prefix `/kategorien/` and slug (Slice 3); no change to `/produkte` or `/kollektionen/*` in Slice 1.
4. **Queries**: `lib/catalog/category-queries.ts` for nav and listing-by-slug; public re-exports from `features/catalog` for bounded context API.
5. **Nav visibility (Slice 4)**: Slice 1 exposes data; rules (active category, product count, max top-level links) implemented when header/footer integrate categories.

## Consequences

- Products may have zero categories until Admin Slice 2; empty categories must not appear in nav (future slice).
- Primary category drives breadcrumbs and canonical listing context (Slice 3).
- `Product.categoryTag` (legacy PDP line) stays independent — not replaced by taxonomy in v1.

## Guardrails

- Do not remove or merge collections.
- Do not require categories for checkout or inventory.
- DE-only slugs until i18n is explicitly approved.

## Revisit when

- Multi-level hierarchy beyond one child level is required.
- Faceted search / PIM-style attributes ship (Epic 8 overlap).
