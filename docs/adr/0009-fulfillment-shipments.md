# ADR-0009: Fulfillment shipments and shipping-label port

- Status: Accepted (Epic 7, Slice 1)
- Date: 2026-08-11
- Owners: Engineering
- Epic: 7 / Slice 1

## Context

Physical goods today ship via a **manual** Admin transition on `Order` (`status → shipped` with `shippingCarrier` + `trackingNumber`). There is no first-class shipment entity, no return/reship audit trail, and no place for INTERNETMARKE / DHL label purchase. Epic 7 requires idempotent label buy/void, tracking, and returns without conflating payment state.

`/admin/versand` already configures **rates and countries** (`ShopShippingSettings`) — that remains checkout pricing, not fulfillment.

## Options considered

1. **Keep only Order.shippingCarrier / trackingNumber** — rejected: cannot model multi-package, voided labels, reshipments, or provider refs cleanly.
2. **Third-party fulfillment SaaS as system of record** — rejected for v1: ops cost and conflicts with modular monolith ([ADR-0001](./0001-modular-monolith.md)).
3. **First-party `Shipment` owned by `features/fulfillment` + ShippingLabelPort** — chosen: Postgres source of truth; providers (INTERNETMARKE, DHL Parcel, manual) behind an application port.

## Decision

1. **Bounded context:** `features/fulfillment` owns shipments, label orchestration, and return/reship commands. Order aggregate keeps denormalized `shippingCarrier` / `trackingNumber` / `fulfillmentStatus` for list UI and e-mail until a later sync slice.
2. **`shipments` table:** one or more shipments per order; status machine `draft → labeled → shipped → delivered | voided | returned` (with allowed edges documented in domain code).
3. **Label provider enum:** `none` (manual tracking), `internetmarke`, `dhl_parcel`. Slice 1 stores the field; HTTP adapters ship in later slices behind credentials.
4. **ShippingLabelPort** (application port): `purchaseLabel`, `voidLabel`, `fetchLabelDocument` — Slice 1 defines the TypeScript contract and a `NotConfiguredShippingLabelAdapter` that returns typed errors. No network I/O.
5. **Private label files:** storage key on the shipment; durable private object store remains open (ADR-0008 public Blob is insufficient). Slice 1 only stores optional `labelStorageKey`.
6. **Compatibility:** Existing Admin “Versandt” flow with carrier + tracking remains valid. Later slices may create/update a `Shipment` when that transition runs.
7. **Out of scope for Slice 1:** Admin UI for shipments, provider HTTP, webhook ingestion, automatic INTERNETMARKE product selection, returns UI.

## Consequences

Positive:

- Clear owner for fulfillment before provider credentials exist.
- Manual shipping keeps working; labels can attach later without rewriting Order.
- Architecture check already lists `fulfillment` as a module.

Negative / accepted trade-offs:

- Temporary dual write surface (Order denormalized fields + Shipment) until sync slice.
- Label privacy depends on a future private storage decision.

## Guardrails

- Never treat label purchase success as payment success.
- Label buy/void must be idempotent (provider ref + inbox/outbox patterns in later slices).
- Do not import provider SDKs outside `features/fulfillment/infrastructure`.
- Cross-module imports only via `@/features/fulfillment` public API.
- Workshop bookings without physical goods must not require a shipment.

## Revisit when

- Multi-package per order is operationally required.
- Private Blob / document store for label PDFs is chosen.
- INTERNETMARKE or DHL credentials are available for Slice 2+.
