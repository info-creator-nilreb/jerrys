# ARCHITECTURE.md

## Target Architecture
Build a **modular monolith** using a single Next.js application.

### Stack
- Next.js (App Router)
- React
- TypeScript
- PostgreSQL
- Prisma ORM
- Auth.js for admin authentication
- Zod for runtime validation
- React Hook Form for admin and checkout forms if needed
- Email provider abstraction with an initial provider such as Resend
- Vitest for unit/integration tests
- Playwright for end-to-end tests

## Why This Architecture
For a shop with only two products, separated frontend/backend systems would increase infrastructure and cognitive load without meaningful business value. A modular monolith is simpler to deploy, easier to reason about, and still allows clean separation of concerns.

## High-Level Structure
```text
app/
  (storefront)/
  admin/
  api/
features/
  catalog/
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

### IdempotencyKey
Purpose: deduplicate critical requests.

Suggested fields:
- id
- scope
- key
- payloadHash nullable
- createdAt

## Order State Machine
### States
- `draft`
- `pending_payment`
- `paid`
- `processing`
- `shipped`
- `completed`
- `cancelled`
- `refunded`

### Allowed transitions
- `draft` -> `pending_payment` via `PLACE_ORDER`
- `pending_payment` -> `paid` via `CONFIRM_PAYMENT`
- `paid` -> `processing` via `START_PROCESSING`
- `processing` -> `shipped` via `MARK_AS_SHIPPED`
- `shipped` -> `completed` via `COMPLETE_ORDER`
- `pending_payment` -> `cancelled` via `CANCEL_ORDER`
- `paid` -> `cancelled` via `CANCEL_ORDER` only if business rule permits and fulfillment has not started
- `paid` -> `refunded` via `REFUND_ORDER`
- `shipped` -> `refunded` via `REFUND_ORDER` only if business rule permits

### Required behaviors
- transition validation is centralized
- invalid transitions fail clearly
- every transition writes history
- transitions may emit domain events

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
- Admin uses Auth.js
- public customers do not need accounts in V1
- admin authorization is enforced on the server
- route protection and action protection are both required

## Persistence Rules
- Prisma is the only ORM
- schema changes via migrations only
- `createdAt` and `updatedAt` required on all core entities
- unique constraints on SKU, order number, slug where applicable
- use soft delete only where there is a real business reason; prefer `isActive` for products

## Logging and Observability
- use structured logging
- all order transitions logged
- all email attempts logged
- critical checkout errors logged with correlation ID if possible

## UI Principles
- minimal, fast, storefront-first
- admin UI should be utility-focused, not decorative
- keep admin actions explicit and reversible where possible
- do not hide important status information
