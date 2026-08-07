# ADR 0003: Catalog variants and collections

## Status

Accepted (Epic 2)

## Context

Products today store price and stock on the `products` row. Epic 2 requires SKU-level inventory, variant-specific pricing, and merchandising collections without breaking checkout, reservations (Epic 1), or existing catalog data.

## Decision

1. Introduce `product_variants` as the **authoritative** sellable unit for price, purchasability rules, and `available_quantity` / `stock_quantity`.
2. Each existing product receives exactly one **default** variant in migration `20260807160000_epic2_catalog_variants`, copying current product fields and a stable SKU (`product_number` or `SKU-<productId>`).
3. `cart_lines`, `order_items`, `stock_reservations`, and `stock_movements` reference `product_variant_id`. `product_id` remains on reservations/movements/order lines for reporting and backward-compatible admin views.
4. `products` price/stock columns remain during expand phase; admin save **dual-writes** the default variant and mirrors summary fields on `products` for unchanged storefront list queries (contract phase later).
5. `collections` and `collection_products` model manual merchandising groups (slug, sort order); filters/sale badges follow in later Epic 2 slices.
6. Catalog domain helpers live in `features/catalog` public API; inventory continues in `features/inventory` and operates on variant IDs.

## Consequences

- Reservations and warehouse movements must update variant quantities atomically; product mirror fields stay in sync for default variant only until multi-variant UI ships.
- New variants require unique SKUs globally.
- Storefront variant picker and multi-variant admin are follow-up stories within Epic 2.

## Rollback

- Revert application deploy; run down migration only if no orders/carts reference non-default variants (Epic 2 slice 1: safe while single default variant per product).
