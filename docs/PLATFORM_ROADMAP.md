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
- Generic free-form CMS/page builder with arbitrary code or third-party blocks (Epic 12 is a constrained CMS light)

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

Suggested delivery: [EPIC3_CUSTOMER_ACCOUNTS.md](./EPIC3_CUSTOMER_ACCOUNTS.md) (Passwort + Magic Link, Bestellungen, Adressen, Termine, Gastzuordnung).

User stories:

- As a customer, I can securely register, sign in, and manage orders and addresses.
- As a customer, I can use password or magic-link authentication and manage my workshop bookings.
- As a guest, I can order without creating an account.
- As a verified customer, I can attach matching guest orders to my account without unsafe email-only merging.
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

Suggested delivery: [EPIC5_GROUP_BOOKING.md](./EPIC5_GROUP_BOOKING.md) (Gruppentermine, geteilte Kapazität, CMS-/PDP-Einbettung).

User stories:

- As an admin, I can schedule workshop sessions with time, place, capacity, price, and booking rules.
- As an admin, I can define minimum total attendance, maximum capacity, publishing state, and customer cancellation cutoff.
- As a customer, I can see available sessions and remaining seats.
- As a customer, I can book one or more seats while sharing total capacity with other customers.
- As a customer, I can temporarily hold seats during checkout and pay online when payment is required.
- As a customer, I receive confirmation, calendar information, and cancellation terms.
- As an admin, I can manage participants, attendance, cancellation, and refunds.

Exit criteria: concurrent requests cannot confirm the last seat twice; multiple partial bookings never exceed capacity; unpaid holds expire; payment, cancellation, and booking state remain consistent.

## Epic 6: Zettle POS

**Status:** Slices 1–4 umgesetzt (Verbindung, Cron-Pull, Webhook, Discrepancy).  
Suggested delivery: [EPIC6_ZETTLE_POS.md](./EPIC6_ZETTLE_POS.md).

User stories:

- As an operator, I can map shop variants to Zettle products.
- As an operator, POS purchases reduce the shop-owned inventory through idempotent movements.
- As an admin, I can inspect and retry synchronization failures.
- As an operator, I receive discrepancy reports.

Exit criteria: Zettle cannot silently overwrite shop inventory; conflicts and negative stock create actionable alerts.

## Epic 7: Shipping and Returns

**Status:** in progress (Slice 1 domain on branch/main).  
Suggested delivery: [EPIC7_SHIPPING_RETURNS.md](./EPIC7_SHIPPING_RETURNS.md).  
**Agent-Handoff:** [EPIC7_AGENT_HANDOFF.md](./EPIC7_AGENT_HANDOFF.md).  
**ADR:** [0009-fulfillment-shipments.md](./adr/0009-fulfillment-shipments.md).

User stories:

- As an admin, I can create a shipment from a paid order.
- As an admin, I can buy, retrieve, and void INTERNETMARKE and optional DHL labels.
- As a customer, I receive shipping confirmation and tracking.
- As an admin, I can handle pickup, returns, and reshipment.

Exit criteria: label purchase is idempotent; protected label files have retention rules; tracking and refunds are auditable.

## Epic 8: Storefront and Admin Completion

Suggested delivery: [EPIC8_STOREFRONT_COMPLETION.md](./EPIC8_STOREFRONT_COMPLETION.md) (Agent-Handoff, Slices).

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

- As a merchandiser, I can define categories (name, slug, description, sort order, active/inactive) and link collections so products appear in nav listings; primary category for SEO/breadcrumbs is derived via collection membership.
- As a customer, I can browse products by category from the header (desktop and mobile) and land on category pages with filters and sorting consistent with `/produkte`.
- As a customer, I see breadcrumbs and page titles that reflect category hierarchy when a nested taxonomy is enabled.
- As an operator, I can leave products without a collection (and thus without a category) and still expose them via the all-products catalog (`/produkte`) until assignment is complete.
- As the system, I do not show inactive or empty categories in the storefront navigation (same visibility rules as active collections today).

Suggested delivery slices (see [EPIC10_PRODUCT_CATEGORIES.md](./EPIC10_PRODUCT_CATEGORIES.md)):

1. ADR and schema (`categories`, collection links, optional parent for one level of nesting initially).
2. Admin: category CRUD, collection assignment on categories, nav sort order.
3. Storefront: category index and `/kategorien/[slug]` listing (reuse existing product cards, filters, sort from Epic 2).
4. Header/footer: build nav from active categories; cap depth and count for compact header; collections remain separate optional links.
5. Migration and SEO: backfill optional default category; metadata and redirects policy documented.

Exit criteria: every active category in nav resolves to a published listing; products remain discoverable on `/produkte`; admin assignment is auditable; automated tests cover nav visibility rules and slug routing; WCAG and mobile menu behavior match [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

Out of scope for this epic (explicit):

- Multi-level unlimited taxonomy and faceted attribute navigation (follow-up if needed).
- Replacing collections; collapsing categories and collections into one entity without a menu system.
- Marketplace-style vendor categories.

## Epic 11: Central Shop Settings and Branding

**Status:** delivered (Slices 1–6 on `main`).  
Suggested delivery: [EPIC11_BRANDING_SETTINGS.md](./EPIC11_BRANDING_SETTINGS.md).  
**Agent-Handoff:** [EPIC11_AGENT_HANDOFF.md](./EPIC11_AGENT_HANDOFF.md).  
Ops: [OPERATIONS.md](./OPERATIONS.md#shop-settings-and-branding-epic-11).

User stories:

- As an admin, I can configure the single shop's logo, favicon, colors, shop name, contact details, business information, and social links centrally.
- As an operator, I see the same authoritative branding in storefront, admin login, email, metadata, and invoices.
- As a maintainer, I can migrate the existing jerry's branding without visual regression.

Exit criteria: branding changes require no code deploy; uploads use durable storage; invalid or inaccessible color configurations cannot silently break critical UI; existing branding remains the migration default.

## Epic 12: Content Pages and CMS Light

**Status:** delivered (Slices 1–7 on `main`, inkl. Termin-Kalender-Block).  
Suggested delivery: [EPIC12_CONTENT_PAGES_CMS.md](./EPIC12_CONTENT_PAGES_CMS.md).  
**Agent-Handoff:** [EPIC12_AGENT_HANDOFF.md](./EPIC12_AGENT_HANDOFF.md).

User stories:

- As an admin, I can build the homepage and content pages from a curated set of safe blocks.
- As an admin, I can save drafts, preview privately, and publish explicitly.
- As an admin, I can choose public URLs while preserving existing homepage, legal, shipping, and information-page URLs by default.
- As an editor, I can maintain legal text with stricter sanitization and audit requirements.
- As an editor, I can embed product/category content and the Epic-5 booking calendar without custom code.

Exit criteria: drafts are private and excluded from navigation/sitemaps; published pages preserve canonical URLs; arbitrary HTML/CSS/JavaScript cannot execute; current pages migrate without broken links.

## Epic 13: AI-Assisted Content and Images

Suggested delivery: [EPIC13_AI_CONTENT_ASSISTANCE.md](./EPIC13_AI_CONTENT_ASSISTANCE.md) · Agent handoff: [EPIC13_AGENT_HANDOFF.md](./EPIC13_AGENT_HANDOFF.md) · ADR: [0010](./adr/0010-ai-content-assistance-port.md).

User stories:

- As an admin, I can generate draft product text, SEO copy, bullets, and alt text from approved product facts.
- As an admin, I can generate or edit product images and review them before permanent storage.
- As an operator, I can use OpenAI first while keeping provider-specific code behind a replaceable application port.
- As an owner, I can set cost/rate limits and inspect usage and provider failures.

Exit criteria: no AI output is stored or published without explicit confirmation; no customer data or secrets enter prompts; text/image operations are rate- and cost-limited, observable, moderated, and provider-replaceable.

## Epic 14: Semantic Search and AI Discoverability

Suggested delivery: [EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md](./EPIC14_SEMANTIC_SEARCH_DISCOVERABILITY.md).

User stories:

- As a customer, I can find products using natural German phrasing, intent, and synonyms.
- As the storefront, I combine semantic and lexical retrieval while retaining authoritative availability/category filters.
- As an operator, I can monitor index freshness, search quality, latency, cost, and fallback rate.
- As a public catalog, I expose consistent schema.org metadata and a read-only machine-readable product feed for search and AI agents.

Exit criteria: semantic search improves a versioned evaluation set and safely falls back to lexical search; provider/index failures do not block catalog browsing; public machine-readable resources expose no private data. Agent checkout and other write actions remain out of scope.
