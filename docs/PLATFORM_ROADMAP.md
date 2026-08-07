# Platform Roadmap

## Product Goal

Evolve the existing shop into a reliable boutique commerce platform without rebuilding the working storefront, admin, order, promotion, email, invoice, and test foundations.

Confirmed decisions:

- Architecture: modular monolith, not microservices
- Deployment: Vercel remains the application platform
- Workshops: live sessions with capacity, temporary holds, online payment, and cancellation
- Inventory: this shop is the source of truth; Zettle is a downstream POS channel
- Payments: Stripe and PayPal use one provider-neutral payment core
- Shipping: INTERNETMARKE for suitable Deutsche Post products, optionally DHL Parcel for packages

Out of scope until explicitly approved:

- Marketplace or multi-tenant capabilities
- Generic plugin ecosystem
- Multi-warehouse and full ERP functionality
- International tax automation, multi-language, and multi-currency
- Generic CMS page builder

## Delivery Principles

1. Deliver vertical, reversible slices behind feature flags where risk warrants it.
2. Stabilize money, stock, capacity, and idempotency before adding provider breadth.
3. Each story includes acceptance criteria, tests, telemetry, migration, and rollback impact.
4. No epic may depend on an unspecified synchronous behavior from a later epic.
5. The quality gates in [QUALITY_GUARDRAILS.md](./QUALITY_GUARDRAILS.md) apply to every epic.

## Epic 0: Architecture and Operations Foundation

Goals:

- Establish bounded contexts and automated import boundaries.
- Record architecture decisions and Vercel operating constraints.
- Define privacy, security, updateability, performance, testing, and release gates.
- Define environment isolation, durable jobs, object storage, backups, monitoring, and runbooks.

Exit criteria:

- Architecture decisions and module contracts are versioned.
- `npm run architecture:check` passes in CI.
- Preview, staging, and production topology is documented.
- Queue/job, object storage, database, authentication, and observability products are selected in follow-up ADRs before their first implementation.
- Restore and secret-rotation exercises are scheduled before production cutover.

## Epic 1: Commerce Core

User stories:

- As an operator, I need separate order, payment, and fulfillment states so that refunds and shipping do not falsify payment status.
- As the system, I need atomic stock reservations and idempotent finalization so retries cannot oversell or double-charge.
- As support, I need a complete event history so every critical transition is explainable.
- As the system, I need a transactional outbox and webhook inbox so side effects are recoverable.

Exit criteria: duplicate or concurrent events affect money, stock, and status at most once; invalid transitions are rejected and audited.

## Epic 2: Catalog, Variants, and Inventory

User stories:

- As an admin, I can manage products with variants, SKU, price, stock, images, and attributes.
- As a customer, I can select only available variants and see their delivery status.
- As a merchandiser, I can manage collections, filters, sorting, sale prices, and badges.
- As an operator, I can trace every stock movement.

Exit criteria: existing products migrate without data loss; price and stock are variant-specific; the last item cannot be oversold.

## Epic 3: Customers and Privacy

User stories:

- As a customer, I can securely register, sign in, and manage orders and addresses.
- As a guest, I can order without creating an account.
- As a customer, I can request access, export, correction, or deletion of my data.
- As an administrator, I can assist customers without exposing or incorrectly merging data.

Exit criteria: identities are verified; orders are not merged solely by matching email; privacy workflows and authorization tests are documented.

## Epic 4: Stripe, PayPal, and Refunds

User stories:

- As a customer, I can pay through Stripe or PayPal.
- As the system, I finalize payments only from verified provider evidence.
- As a customer, I can safely retry an interrupted payment without a duplicate charge.
- As an admin, I can issue full or partial provider-confirmed refunds.
- As an operator, I can reconcile internal transactions with providers.

Exit criteria: success, failure, timeout, replay, partial refund, and reconciliation paths have automated coverage.

## Epic 5: Live Workshop Booking

User stories:

- As an admin, I can schedule workshop sessions with time, place, capacity, price, and booking rules.
- As a customer, I can see available sessions and remaining seats.
- As a customer, I can temporarily hold seats during checkout and pay online.
- As a customer, I receive confirmation, calendar information, and cancellation terms.
- As an admin, I can manage participants, attendance, cancellation, and refunds.

Exit criteria: concurrent requests cannot confirm the last seat twice; unpaid holds expire; payment and booking state remain consistent.

## Epic 6: Zettle POS

User stories:

- As an operator, I can map shop variants to Zettle products.
- As an operator, POS purchases reduce the shop-owned inventory through idempotent movements.
- As an admin, I can inspect and retry synchronization failures.
- As an operator, I receive discrepancy reports.

Exit criteria: Zettle cannot silently overwrite shop inventory; conflicts and negative stock create actionable alerts.

## Epic 7: Shipping and Returns

User stories:

- As an admin, I can create a shipment from a paid order.
- As an admin, I can buy, retrieve, and void INTERNETMARKE and optional DHL labels.
- As a customer, I receive shipping confirmation and tracking.
- As an admin, I can handle pickup, returns, and reshipment.

Exit criteria: label purchase is idempotent; protected label files have retention rules; tracking and refunds are auditable.

## Epic 8: Storefront and Admin Completion

User stories:

- As a customer, I can search, filter, sort, select variants, and use a responsive cart.
- As a customer, I can apply vouchers and understand shipping costs before payment.
- As a customer, I see consistent legal, shipping, and return information.
- As an admin, I can operate catalog, customers, workshops, orders, payments, shipping, and integration errors centrally.

Exit criteria: critical flows are accessible, mobile-tested, consent-compliant, and within performance budgets.

## Epic 9: Hardening and Go-Live

User stories:

- As an operator, I can migrate existing data through a rehearsed and reversible process.
- As the team, we have security, privacy, load, resilience, and recovery gates.
- As an operator, I have runbooks for provider failure, reconciliation, queue backlog, restore, and rollback.
- As the product owner, I can activate the platform in measured stages.

Exit criteria: migration and rollback are rehearsed; critical findings are closed; alerts and support paths are active.

## Epic 10: Product Categories and Storefront Navigation

Depends on: Epic 2 (sellable catalog, collections as merchandising). Complements Epic 8 (search, filter, sort on listing pages) without duplicating collection-based curation.

Goals:

- Replace interim header IA (“Shop” plus named collection links) with a **category-driven** primary navigation where it adds customer value.
- Keep **collections** as optional merchandising (campaigns, curated mixes); they must not be the only way to browse by product type.
- Preserve mobile burger navigation; category links populate the same menu component.

User stories:

- As a merchandiser, I can define categories (name, slug, description, sort order, active/inactive) and assign products to one or more categories with a clear primary category for listings and SEO.
- As a customer, I can browse products by category from the header (desktop and mobile) and land on category pages with filters and sorting consistent with `/produkte`.
- As a customer, I see breadcrumbs and page titles that reflect category hierarchy when a nested taxonomy is enabled.
- As an operator, I can leave products without a category and still expose them via the all-products catalog (`/produkte`) until assignment is complete.
- As the system, I do not show inactive or empty categories in the storefront navigation (same visibility rules as active collections today).

Suggested delivery slices (see [EPIC10_PRODUCT_CATEGORIES.md](./EPIC10_PRODUCT_CATEGORIES.md)):

1. ADR and schema (`categories`, product assignment, optional parent for one level of nesting initially).
2. Admin: category CRUD, product assignment, nav sort order.
3. Storefront: category index and `/kategorien/[slug]` listing (reuse existing product cards, filters, sort from Epic 2).
4. Header/footer: build nav from active categories; cap depth and count for compact header; collections remain separate optional links.
5. Migration and SEO: backfill optional default category; metadata and redirects policy documented.

Exit criteria: every active category in nav resolves to a published listing; products remain discoverable on `/produkte`; admin assignment is auditable; automated tests cover nav visibility rules and slug routing; WCAG and mobile menu behavior match [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

Out of scope for this epic (explicit):

- Multi-level unlimited taxonomy and faceted attribute navigation (follow-up if needed).
- Replacing collections; merging categories and collections into one concept.
- Marketplace-style vendor categories.
