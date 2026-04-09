# TEST_STRATEGY.md

## Objective
Testing must focus on reliability of commerce-critical flows, not on achieving vanity coverage numbers.

Primary risks to control:
- duplicate orders
- invalid state transitions
- duplicate emails
- price manipulation
- broken checkout
- broken admin status handling

## Test Pyramid
### 1. Unit Tests
Test pure logic and isolated business rules.

Priority targets:
- order state machine transitions
- guard conditions
- pricing calculations
- order number generation format
- snapshot mapping logic
- email deduplication logic
- validation helpers

### 2. Integration Tests
Test application services with database and infrastructure boundaries mocked or partially real.

Priority targets:
- create order from checkout payload
- create order item snapshots
- persist order history on transition
- write email log records
- admin product CRUD service behavior
- authorization checks on admin use cases

### 3. End-to-End Tests
Test the most important user flows through the running application.

Priority targets:
- product page to cart to checkout success
- admin login
- admin creates product
- admin changes order status
- legal pages accessible

## Required Test Categories
### Domain Tests
Must exist for:
- all allowed order transitions
- all forbidden order transitions
- side-effect trigger decision logic
- dedupe key generation

### Application Tests
Must exist for:
- order creation from checkout payload
- product snapshot persistence
- prevention of duplicate order on repeated submit with same idempotency key
- creation of email log and dedupe behavior

### UI Smoke Tests
Must exist for:
- product listing renders active products only
- inactive products not visible publicly
- admin order detail renders status history

## E2E Minimum Suite for V1
1. customer can open product page
2. customer can add product to cart
3. customer can complete checkout with valid data
4. order confirmation page is shown
5. order exists in admin or database assertion layer
6. admin can log in
7. admin can see order list
8. admin can transition order from paid to processing if valid

## Automation Stack
- `Vitest` for unit and integration tests
- `Playwright` for E2E tests
- `Testing Library` for React component tests only where helpful
- Prisma test database for integration tests

## Recommended Commands
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## CI Quality Gate
Every pull request or major change should pass:
1. lint
2. typecheck
3. unit tests
4. integration tests
5. critical E2E smoke tests

## Fixture Strategy
- keep fixtures small and explicit
- use seeded test products
- use deterministic order payloads
- do not overuse huge global fixtures

## Email Testing Strategy
- abstract provider behind interface
- use fake provider in unit/integration tests
- assert on generated email intent and EmailLog creation
- E2E should not rely on real inbox delivery

## Database Test Strategy
- separate test database
- migrations applied before integration/e2e runs
- cleanup per test or per suite depending on performance
- avoid hidden coupling between tests

## Coverage Guidance
Coverage thresholds are secondary to risk coverage. Still recommended:
- state machine logic: very high coverage
- checkout application service: high coverage
- admin status transition service: high coverage
- UI cosmetics: lower priority

## Required Regression Tests
Whenever a bug is fixed in one of these areas, add a regression test:
- checkout duplication
- invalid order transition
- email duplicate send
- product visibility bug
- admin authorization bug
