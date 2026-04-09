# AGENT.md

## Mission
Build a small, production-ready e-commerce application that replaces an overpowered Shopware setup for a catalog of only two products. The system must be simple, reliable, maintainable by one developer with AI assistance, and deliberately limited in scope.

The goal is **not** to recreate Shopware. The goal is to build the minimum custom commerce system that is operationally better suited to this business.

## Scope for V1
Included:
- Public storefront with product listing and product detail pages
- Cart
- Checkout
- Order creation
- Order confirmation email
- Admin login
- Admin product management
- Admin order management
- Explicit order state machine
- Status-based email events
- Legal pages and basic SEO foundation

Excluded from V1:
- Coupons and discounts
- Product variants unless explicitly requested later
- Customer accounts and self-service portal
- Reviews, wishlists, recommendations
- Multi-language and multi-currency
- ERP/WaWi integration
- Plugin architecture
- Multi-tenant support
- Generic CMS page builder
- Complex inventory logic

## Success Criteria
V1 is successful when:
1. The two products can be managed in admin.
2. A customer can complete a purchase reliably.
3. Orders are stored with frozen product snapshots.
4. Orders move only through allowed state transitions.
5. Required emails are triggered exactly once per relevant event.
6. Admin can see order history and status history.
7. The codebase remains understandable and maintainable by one developer.

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

## Security Rules
- Admin authorization must be enforced server-side.
- Client-side prices are never trusted.
- Secrets must stay server-side.
- Forms and mutations must be validated server-side.
- Order state transitions must be authorized and auditable.

## Performance Rules
- Keep JavaScript shipped to the client low.
- Prefer server-rendered pages where possible.
- Optimize product images.
- Avoid unnecessary client state.

## Definition of Done
A task is done only if:
- functional behavior matches the task
- architecture constraints are respected
- code passes tests/lint/typecheck
- edge cases are handled or documented
- docs are updated when needed
