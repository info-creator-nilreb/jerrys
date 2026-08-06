# ADR-0001: Modular Monolith

- Status: Accepted
- Date: 2026-08-06
- Owners: Engineering

## Context

The existing system is one Next.js application backed by PostgreSQL and Prisma. Planned capabilities add product variants, customer accounts, Stripe, PayPal, live workshop capacity, Zettle POS synchronization, and shipping labels.

Orders, payments, stock, and workshop capacity require strong consistency. The current team and traffic do not provide evidence that independent service scaling or deployment is needed.

## Options Considered

1. Continue without explicit module boundaries.
2. Split the platform into microservices now.
3. Keep one deployable application and database while enforcing bounded contexts in code.

## Decision

Use option 3: a modular monolith.

The bounded contexts are catalog, inventory, customers, orders, payments, workshops, fulfillment, and integrations. A module publishes its supported API from `features/<module>/index.ts`. Other modules and framework code may use that public API but may not import internal domain, application, or infrastructure files.

PostgreSQL remains the transactional source of truth. Durable asynchronous processing is implemented through outbox/inbox patterns and a persistent queue or workflow system, not additional business microservices.

## Consequences

Positive:

- Money, stock, and capacity can share local database transactions.
- One deployment and one operational model remain manageable.
- Existing storefront and admin code can migrate incrementally.
- Explicit APIs preserve a future extraction path.

Negative:

- Module ownership must be enforced by review and tooling.
- One application deployment can affect all modules.
- Database-level ownership is conventional rather than physically isolated.

## Guardrails

- `npm run architecture:check` blocks imports of another module's internals.
- New domain logic belongs to the owning `features/<module>` context.
- Existing `lib/` code is moved only as part of a behavior change, not through a large mechanical rewrite.
- Cross-module side effects use public services or persisted events.
- A network service may not be introduced without an ADR covering data ownership, consistency, authentication, observability, deployment, and failure handling.

## Revisit When

Reconsider extracting a module only when measured evidence shows at least one of:

- independent scaling materially reduces cost or incidents
- independent deployment is required at a different cadence
- a dedicated team owns the capability
- availability or security isolation differs materially
- the module causes demonstrated runtime or delivery bottlenecks

Likely first extraction candidates are integration or webhook workers. Orders, payments, inventory, and workshop capacity should remain transactionally close unless a later design proves otherwise.
