# AGENT.md

## Mission
Build a production-ready commerce application for a boutique shop. The system must stay simple, reliable, maintainable by a small team with AI assistance, and evolve through explicit bounded contexts rather than infrastructure-driven decomposition.

The goal is **not** to recreate Shopify as a generic platform. The goal is to provide the shop-specific capabilities defined in `PLATFORM_ROADMAP.md`, including variants, customer accounts, online payments, live workshop bookings, Zettle synchronization, shipping fulfillment, single-shop branding, and a constrained CMS light.

## Product Scope
Current and planned scope is maintained in `PLATFORM_ROADMAP.md`. The following remain explicitly out of scope until an ADR changes the decision:
- Marketplace and multi-tenant capabilities
- Generic plugin or app ecosystem
- Complex ERP and multi-warehouse management
- Generic free-form CMS/page builder with arbitrary code, templates, plugins, or third-party blocks (the curated block system in Epic 12 is explicitly in scope)
- International tax automation, multi-language, and multi-currency

## Success Criteria
The platform is successful when:
1. Products, variants, workshops, customers, orders, payments, and fulfillment can be operated reliably.
2. Money, stock, and workshop capacity remain consistent under retries and concurrent requests.
3. Required side effects are idempotent, observable, and recoverable.
4. Privacy, security, updateability, and performance guardrails in `QUALITY_GUARDRAILS.md` are met.
5. The codebase remains understandable and maintainable by a small team.

## Architecture Principles
1. **Modular monolith first**
   - Build one Next.js application.
   - Do not split into frontend and backend repositories.
   - Do not introduce microservices.

2. **Server-first**
   - Prefer Server Components by default.
   - Use Client Components only for interaction-heavy UI.
   - Keep business logic on the server.

3. **Domain-driven structure**
   - Organize code around business capabilities, not around framework folders only.
   - Keep domain logic out of React components.
   - Cross-module access is allowed only through the target module's public API or published events.

4. **Explicit workflows**
   - Model order status changes through a single central state machine.
   - Do not scatter status rules across controllers, UI, and database access.

5. **No hidden side effects**
   - UI never sends emails directly.
   - Side effects are triggered through application/domain logic only.

6. **Idempotency for critical operations**
   - Checkout submission must not create duplicate orders.
   - Email events must not send duplicate emails on retries.
   - Webhook-style handlers must be safe to retry.

7. **Prefer simplicity over abstraction**
   - Avoid generic frameworks inside the app.
   - Avoid “future-proofing” that creates unnecessary complexity.

## Source of Truth Documents
- `AGENT.md` defines engineering behavior and architecture constraints.
- `REQUIREMENTS.md` defines product behavior and functional scope.
- `ARCHITECTURE.md` defines the concrete target system design.
- `PLATFORM_ROADMAP.md` defines the current epics and delivery order.
- `QUALITY_GUARDRAILS.md` defines non-functional release gates.
- `DESIGN_SYSTEM.md` defines shared storefront and administrative UI premises.
- `OPERATIONS.md` defines the Vercel operating baseline.
- `TEST_STRATEGY.md` defines the quality and automation approach.
- `DELIVERY_PLAN.md` defines implementation order.

When implementing any task, always read all relevant sections of these documents before making changes.

## Working Rules for Cursor
1. Read before editing.
2. Identify impacted modules before writing code.
3. Make the smallest change that satisfies the task.
4. Do not perform unrelated refactors.
5. Keep architectural boundaries intact.
6. Do not invent features that are not required.
7. Prefer explicit code over clever code.
8. Update tests when behavior changes.
9. Update documentation if a material decision changes.
10. Call out assumptions explicitly in every task response.

## Implementation Order Rules
For new features, work in this sequence whenever possible:
1. requirements and constraints
2. schema and types
3. domain logic
4. application layer
5. UI
6. tests
7. documentation

## Layer Responsibilities
### UI Layer
- Pages, forms, views, components
- No business decisions
- No direct DB access
- No direct email sending

### Application Layer
- Orchestrates use cases
- Calls domain services and repositories
- Applies authorization and validation flow
- Triggers domain events

### Domain Layer
- Business entities and value objects
- State machine logic
- Transition rules
- Domain event definitions

### Infrastructure Layer
- Prisma repositories
- email provider integration
- file storage integration
- logging integration
- auth integration

## Quality Bar
- TypeScript strict mode
- No `any` without an explicit justification comment
- Runtime validation for external input
- Structured error handling
- Auditability for state transitions
- Tests for critical business logic
- Architecture boundary check passes
- Relevant non-functional guardrails have measurable evidence

## Security Rules
- Admin authorization must be enforced server-side.
- Client-side prices are never trusted.
- Secrets must stay server-side.
- Forms and mutations must be validated server-side.
- Order state transitions must be authorized and auditable.
- Provider webhooks must verify signatures and be safe against replay.
- Personally identifiable data must not be written to logs unless explicitly redacted.

## Performance Rules
- Keep JavaScript shipped to the client low.
- Prefer server-rendered pages where possible.
- Optimize product images.
- Avoid unnecessary client state.

## Design Rules
- Follow `DESIGN_SYSTEM.md` for both storefront and administrative backend.
- Use familiar, minimal commerce patterns without copying Shopify assets or layouts.
- Keep one dominant primary action per view and make authoritative server state explicit.
- Reuse semantic tokens and shared patterns before adding one-off colors, shadows, radii, or controls.
- Include accessible empty, loading, pending, success, failure, disabled, and responsive states as applicable.

## Definition of Done
A task is done only if:
- functional behavior matches the task
- architecture constraints are respected
- code passes tests/lint/typecheck
- edge cases are handled or documented
- docs are updated when needed
- deployment, migration, observability, privacy, and rollback implications are addressed
