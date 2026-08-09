# ARCHITECTURE.md

## Target Architecture
Build a **modular monolith** using a single Next.js application.

### Stack
- Next.js (App Router)
- React
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js for admin and customer authentication (see [ADR-0005](./adr/0005-customer-authentication.md))
- Zod for runtime validation
- React Hook Form for admin and checkout forms if needed
- Email provider abstraction with an initial provider such as Resend
- Vitest for unit/integration tests
- Playwright for end-to-end tests

## Why This Architecture
The business requires strong consistency between orders, payments, stock, and workshop capacity. Separating these concerns into networked services would add distributed transactions, eventual consistency, service authentication, and operational overhead without a demonstrated scaling need. A modular monolith is simpler to deploy and reason about while still enforcing clean domain boundaries.

This decision is recorded in [ADR-0001](./adr/0001-modular-monolith.md). Extraction into a service requires a new ADR and measurable evidence that a module needs independent scaling, deployment, ownership, or availability.

## Bounded Contexts
New commerce capabilities are organized into these modules:

- `catalog`: products, variants, collections, prices, and media
- `inventory`: stock movements, reservations, and availability
- `customers`: identities, profiles, addresses, consent, and privacy operations
- `orders`: cart finalization, orders, line snapshots, and promotions
- `payments`: payment attempts, provider transactions, webhooks, refunds, and reconciliation
- `workshops`: sessions, capacity, reservations, bookings, and attendance
- `fulfillment`: shipments, labels, tracking, pickup, and returns
- `integrations`: provider adapters, email, object storage, and durable jobs

Each module exposes a public API from `features/<module>/index.ts`. Code outside a module must not import its `domain`, `application`, or `infrastructure` internals. Cross-module collaboration uses public application services or published events. `npm run architecture:check` enforces this import rule.

Existing code under `lib/` is migrated incrementally when an affected use case is changed. Epic 0 does not perform a risky mechanical move of working commerce code.

## Runtime and Persistence
- One Next.js application is deployed to Vercel.
- PostgreSQL is the transactional source of truth.
- Provider callbacks use Route Handlers; UI-coupled mutations may use Server Actions.
- Durable asynchronous work uses a persistent outbox and a queue/job provider. Critical work must not depend on in-memory timers.
- Product media, invoices, and shipping labels use private or public object storage according to data classification. The Vercel filesystem is not persistent storage.
- Preview, staging, and production are isolated environments with separate data and provider credentials.

## High-Level Structure
```text
app/
  (storefront)/
  admin/
  api/
features/
  catalog/
  customers/
  cart/
  checkout/
  orders/
  admin/
  auth/
  email/
components/
lib/
  db/
  auth/
  validation/
  logging/
prisma/
emails/
tests/
```

## Recommended Repository Structure
```text
.
├─ app/
│  ├─ (storefront)/
│  │  ├─ page.tsx
│  │  ├─ products/
│  │  ├─ cart/
│  │  ├─ checkout/
│  │  └─ order-confirmation/
│  ├─ admin/
│  │  ├─ login/
│  │  ├─ products/
│  │  └─ orders/
│  └─ api/
├─ features/
│  ├─ catalog/
│  │  ├─ domain/
│  │  ├─ application/
│  │  ├─ infrastructure/
│  │  └─ ui/
│  ├─ cart/
│  ├─ checkout/
│  ├─ orders/
│  ├─ admin/
│  ├─ auth/
│  └─ email/
├─ components/
│  ├─ ui/
│  └─ shared/
├─ lib/
│  ├─ db/
│  ├─ auth/
│  ├─ validation/
│  ├─ logging/
│  └─ utils/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ emails/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
└─ docs/
```

## Domain Model
### Product
Purpose: a sellable item in the storefront.

Suggested fields:
- id
- slug
- sku
- name
- shortDescription
- description
- priceGross
- currency
- isActive
- availabilityStatus
- createdAt
- updatedAt

### ProductImage
Purpose: media attached to a product.

Suggested fields:
- id
- productId
- url
- altText
- sortOrder

### Order
Purpose: aggregate root for a purchase.

Suggested fields:
- id
- orderNumber
- customerEmail
- customerFirstName
- customerLastName
- billingAddressJson or address fields
- shippingAddressJson or address fields
- subtotalGross
- shippingGross
- totalGross
- currency
- status
- createdAt
- updatedAt

### OrderItem
Purpose: frozen purchased line item.

Suggested fields:
- id
- orderId
- productId nullable
- productSnapshotName
- productSnapshotSku
- unitPriceGross
- quantity
- totalPriceGross

### OrderStatusHistory
Purpose: audit trail of state changes.

Suggested fields:
- id
- orderId
- fromStatus
- toStatus
- eventName
- actorType
- actorId
- reason
- createdAt

### EmailLog
Purpose: delivery tracking and deduplication evidence.

Suggested fields:
- id
- orderId nullable
- emailType
- recipient
- templateKey
- providerMessageId nullable
- dedupeKey
- status
- errorMessage nullable
- sentAt nullable
- createdAt

### AdminUser
Purpose: admin authentication and authorization subject.

Suggested fields:
- id
- email
- passwordHash or provider auth reference
- role
- isActive
- createdAt
- updatedAt
- lastLoginAt nullable

### Customer / CustomerIdentity / CustomerAuthToken
Purpose: storefront customer identity (Epic 3). Not derived from order emails.

Implemented fields (Slice 1):
- Customer: email (normalized unique), emailVerifiedAt, optional names/passwordHash, isActive, lastLoginAt
- CustomerIdentity: provider (`password` | `magic_link`) + providerSubject
- CustomerAuthToken: purpose (`email_verify` | `magic_link` | `password_reset`), tokenHash, expiresAt, consumedAt

### IdempotencyKey
Purpose: deduplicate critical requests.

Suggested fields:
- id
- scope
- key
- payloadHash nullable
- createdAt

## State Machines
Order, payment, fulfillment, and workshop booking lifecycles are separate:

- Order: `pending_payment`, `confirmed`, `cancelled`, `completed`
- Payment: `pending`, `processing`, `succeeded`, `partially_refunded`, `refunded`, `failed`, `cancelled`
- Fulfillment: `unfulfilled`, `preparing`, `shipped`, `delivered`, `returned`
- Booking: `held`, `confirmed`, `cancelled`, `attended`, `no_show`, `refunded`, `expired`

Exact transitions and guards are defined in the owning domain module. Every transition is centrally validated and records actor, timestamp, reason, and correlation ID. A payment provider transaction is recorded before aggregate payment state changes. Browser redirects are never authoritative payment confirmation.

## Domain Events
Suggested initial events:
- `OrderPlaced`
- `PaymentConfirmed`
- `OrderProcessingStarted`
- `OrderShipped`
- `OrderCompleted`
- `OrderCancelled`
- `OrderRefunded`
- `EmailRequested`
- `EmailSent`
- `EmailFailed`
- `StockReserved`
- `StockReservationExpired`
- `WorkshopCapacityHeld`
- `WorkshopBookingConfirmed`
- `ShipmentLabelRequested`

Domain events are persisted through a transactional outbox before asynchronous publication. Consumers are idempotent.

## Application Layer Use Cases
Examples:
- `createProduct`
- `updateProduct`
- `deactivateProduct`
- `getPublicProducts`
- `getProductBySlug`
- `createOrderFromCheckout`
- `transitionOrderStatus`
- `sendOrderEmail`
- `listOrdersForAdmin`
- `getOrderDetailForAdmin`

## API and Mutation Strategy
Use:
- Server Actions for tightly UI-coupled form submissions where appropriate
- Route Handlers for APIs, provider callbacks, webhooks, and explicit server endpoints

Rules:
- all mutations validated with Zod
- no direct Prisma calls from React UI
- keep orchestration in application layer

## Authentication and Authorization
- Admin and customers use Auth.js JWT sessions with explicit `subjectKind` (`admin` | `customer`); see [ADR-0005](./adr/0005-customer-authentication.md)
- Customer identities live in `Customer` / `CustomerIdentity`; one-time tokens in `CustomerAuthToken` (hashed)
- Guest checkout remains available without an account; order attachment is a later Epic 3 slice
- Admin authorization is enforced on the server (`getAdminSession`); customer routes use `getCustomerSession`
- Route protection and action protection are both required

## Persistence Rules
- Prisma is the only ORM
- schema changes via migrations only
- `createdAt` and `updatedAt` required on all core entities
- unique constraints on SKU, order number, slug where applicable
- use soft delete only where there is a real business reason; prefer `isActive` for products
- migrations use expand/contract for changes that cannot be deployed atomically
- prices, addresses, tax rates, product names, and workshop session details are snapshotted on orders
- stock and workshop capacity changes use atomic database operations

## Logging and Observability
- use structured logging
- all order transitions logged
- all email attempts logged
- critical checkout errors logged with correlation ID if possible
- attach `requestId`, `orderId`, `paymentId`, and `eventId` where applicable
- never log secrets, payment credentials, complete addresses, or unnecessary personal data
- alert on webhook failures, outbox backlog, payment reconciliation differences, negative stock, and capacity inconsistencies

## UI Principles
- minimal, fast, storefront-first
- admin UI should be utility-focused, not decorative
- keep admin actions explicit and reversible where possible
- do not hide important status information
- use the shared premises and tokens in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- expose authoritative payment, stock, booking, and fulfillment state instead of optimistic success
- keep Shopify-like interaction familiarity without copying proprietary assets or layouts
