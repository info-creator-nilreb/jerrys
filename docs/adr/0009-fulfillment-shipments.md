# ADR-0009: Fulfillment shipments and shipping-label port

- Status: Accepted (Epic 7, Slice 1 + Slice 3 INTERNETMARKE)
- Date: 2026-08-11
- Owners: Engineering
- Epic: 7 / Slice 1–3

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
4. **ShippingLabelPort** (application port): `purchaseLabel`, `voidLabel` — Slice 1 contract + `NotConfiguredShippingLabelAdapter`. Slice 3: `InternetmarkeShippingLabelAdapter` (REST only; SOAP sunset 2025-12-31) behind `createShippingLabelPortFromEnv()`.
5. **INTERNETMARKE REST:** Base `https://api-eu.dhl.com/post/de/shipping/im/v1`. Auth `POST /user` (form-urlencoded: `grant_type=client_credentials`, `client_id`, `client_secret`, Portokasse `username`/`password`) → Bearer. Purchase `POST /app/shoppingcart/pdf?directCheckout=true` (parameter name is `directCheckout`, not `finalize`). Void `POST /app/retoure` with `{ shoppingCart: { shopOrderId } }`. Addresses use ISO-3166-1 alpha-3; product codes/prices from PPL or Products API via env.
6. **Private label files:** storage key on the shipment; durable private object store remains open (ADR-0008 public Blob is insufficient). Adapter may return a temporary `labelDownloadUrl`; do not treat it as durable storage.
7. **Compatibility:** Existing Admin “Versandt” flow with carrier + tracking remains valid. Later slices may create/update a `Shipment` when that transition runs.
8. **Out of scope still:** Admin UI for label purchase, automatic product selection, DHL Parcel, webhook ingestion, private Blob persistence.


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
- Private Blob / document store for label PDFs is chosen (`labelDownloadUrl` is ephemeral).
- Admin UI wires `purchaseShippingLabelForShipment` / `voidShippingLabelForShipment`.
