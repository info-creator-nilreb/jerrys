# DELIVERY_PLAN.md

## Delivery Philosophy
Implement V1 in small, vertically useful increments. Avoid large horizontal phases that delay feedback.

## Epic 1: Foundations
Goal: establish a stable technical baseline.

Stories:
1. Initialize Next.js project with TypeScript strict mode.
2. Set up linting, formatting, and base scripts.
3. Set up Prisma and PostgreSQL connection.
4. Establish repository folder structure.
5. Add Auth.js admin authentication baseline.
6. Add shared validation and logging utilities.
7. Add test infrastructure with Vitest and Playwright.

## Epic 2: Catalog Domain
Goal: support public and admin product flows.

Stories:
1. Model Product and ProductImage in Prisma.
2. Implement public product read use cases.
3. Build storefront product list page.
4. Build storefront product detail page.
5. Implement admin product list.
6. Implement admin create product.
7. Implement admin edit product.
8. Implement product active/inactive behavior.

## Epic 3: Cart and Checkout
Goal: allow customer purchase flow.

Stories:
1. Define cart storage strategy.
2. Implement add to cart.
3. Implement cart page with quantity and removal.
4. Create checkout form validation.
5. Implement server-side order creation use case.
6. Implement order number generation.
7. Implement order confirmation page.
8. Prevent duplicate order creation with idempotency strategy.

## Epic 4: Orders Domain
Goal: support robust order lifecycle.

Stories:
1. Model Order, OrderItem, OrderStatusHistory, IdempotencyKey.
2. Implement product snapshot mapping for order items.
3. Implement order state machine module.
4. Implement transition validation service.
5. Persist status history on every transition.
6. Build admin order list.
7. Build admin order detail.
8. Expose allowed admin status actions.

## Epic 5: Email and Events
Goal: attach reliable side effects to order events.

Stories:
1. Model EmailLog.
2. Create email provider abstraction.
3. Implement order confirmation email flow.
4. Implement shipping email flow.
5. Implement cancellation email flow.
6. Add email dedupe logic.
7. Show email history in admin order detail.

## Epic 6: Hardening
Goal: make the system production-worthy.

Stories:
1. Add structured operational logging.
2. Add route protection and authorization hardening.
3. Add legal pages.
4. Add image optimization and metadata basics.
5. Add regression tests for critical paths.
6. Review empty/error states.
7. Review accessibility basics.

## Recommended Story Execution Format
For each story, produce:
- title
- goal
- scope
- non-scope
- impacted modules
- acceptance criteria
- implementation notes
- tests to add/update
