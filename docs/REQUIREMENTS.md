# REQUIREMENTS.md

## Product Summary
This project is a custom online shop intended to replace an existing Shopware installation for a very small catalog of only two products. The system should deliver the core e-commerce workflow with minimal operational overhead.

## Business Goals
- Reduce hosting and platform overhead.
- Keep full control over storefront UX and checkout.
- Enable simple product and order management.
- Keep the system maintainable by one developer.
- Support reliable email communication for core order events.

## Core User Roles
### Customer
- browse products
- add products to cart
- complete checkout
- receive confirmation and status emails

### Admin
- sign in securely
- create and edit products
- activate/deactivate products
- view orders
- manage order status transitions
- see order history and email history

## Functional Scope
### Public Storefront
The storefront must include:
- home page or landing page
- product listing page
- product detail pages
- cart
- checkout
- order confirmation page
- legal pages: imprint, privacy policy, terms, withdrawal information

### Product Management
Products must support:
- name
- slug
- SKU
- short description
- long description
- price
- currency
- image gallery
- active/inactive flag
- optional simple availability status

Rules:
- only active products are visible in the storefront
- SKU must be unique
- price authority is server-side only

### Cart
Customers must be able to:
- add a product to cart
- update quantity if quantity support is enabled
- remove items
- view subtotal and total

Rules:
- cart totals must be calculated server-side or server-validated
- inactive or unavailable products must not be purchasable

### Checkout
Checkout must support:
- customer email
- first name and last name
- billing address
- optional different shipping address
- legal consent checkbox(es)
- order summary before submission

Rules:
- all critical inputs must be validated server-side
- final prices must be recalculated on the server before order creation
- duplicate order creation on retries/double-click must be prevented
- successful order creation must generate an order number
- successful order creation must trigger an order confirmation email

### Orders
Orders must include:
- order number
- customer data
- billing and shipping addresses
- order items
- totals
- status
- timestamps

Rules:
- order items must store a product snapshot at time of purchase
- order status changes must be recorded in history
- order history must be visible in admin

### Order State Machine
The order lifecycle must be centrally defined.

Initial target states:
- `draft`
- `pending_payment`
- `paid`
- `processing`
- `shipped`
- `completed`
- `cancelled`
- `refunded`

Initial target events:
- `PLACE_ORDER`
- `CONFIRM_PAYMENT`
- `START_PROCESSING`
- `MARK_AS_SHIPPED`
- `COMPLETE_ORDER`
- `CANCEL_ORDER`
- `REFUND_ORDER`

Rules:
- only allowed transitions may be executed
- transitions must be audited
- transitions may trigger side effects
- side effects must be deduplicated

### Emails
The system must support at least:
- order confirmation email
- payment confirmation email if applicable
- shipping confirmation email
- cancellation confirmation email
- optional internal new-order notification

Rules:
- email sending must be logged
- duplicate emails must be prevented
- failed email sends must be traceable

### Admin Area
The admin area must support:
- secure login
- product list
- product create/edit/deactivate
- order list
- order detail view
- allowed order status actions
- visibility of status history
- visibility of sent email log

Optional for V1 if low effort:
- admin notes on orders
- manual resend of failed emails

## Out of Scope
- coupons, vouchers, discount engine
- product variants unless requested later
- customer accounts
- reviews and wishlist
- recommendation engine
- advanced search
- ERP/WaWi integration
- multi-language
- multi-currency
- multi-store
- marketplace features
- plugin ecosystem
- page builder
- advanced inventory management

## Non-Functional Requirements
### Reliability
- no duplicate orders on retry
- no duplicate event emails on retry
- all critical operations logged
- clear operational error visibility

### Performance
- fast initial product page rendering
- optimized images
- minimal client JavaScript
- no unnecessary client-heavy framework usage

### Security
- admin routes protected
- server-side validation for mutations
- no client-controlled price acceptance
- no secret leakage to client

### Maintainability
- modular codebase
- explicit business rules
- low accidental complexity
- strong TypeScript types
- straightforward local development

### Observability
- structured logs
- audit history for status transitions
- email send log
- clear errors in admin-critical flows

## Acceptance Baseline for V1
V1 is acceptable when:
- both products can be managed and sold
- a customer can successfully submit an order
- the order is stored correctly with snapshots
- admin can view and manage orders
- order status flow is constrained by state rules
- required emails are sent reliably
