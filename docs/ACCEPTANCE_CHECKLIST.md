# ACCEPTANCE_CHECKLIST.md

Use this checklist for every meaningful implementation step.

## Architecture
- Does the change respect AGENT.md?
- Is business logic outside UI components?
- Is there any accidental coupling across modules?
- Does `npm run architecture:check` pass?
- Is a material decision recorded or superseded through an ADR?

## Functional Correctness
- Does behavior match REQUIREMENTS.md?
- Are edge cases considered?
- Are invalid states prevented?

## Data Integrity
- Are prices verified server-side?
- Are order snapshots stored correctly?
- Are unique constraints respected?
- Is idempotency handled where needed?

## Security
- Is authorization enforced server-side?
- Are secrets kept out of client code?
- Is input validated server-side?
- Are webhook signatures, replay protection, CSRF, and distributed rate limits addressed where relevant?
- Are privileged actions audited?

## Privacy
- Are purpose, legal basis, data minimization, recipients, and retention identified?
- Are personal data excluded from URLs, analytics, and unredacted logs?
- Are access, export, correction, and deletion implications addressed?

## Side Effects
- Are emails/event side effects deduplicated?
- Are side effects logged?
- Are failures traceable?

## Quality
- TypeScript strict-safe?
- Lint passes?
- Tests added/updated?
- No unrelated refactor introduced?
- Do relevant performance budgets and accessibility checks pass?
- Are provider contract, concurrency, resilience, or load tests needed?

## Storefront and Admin Design
- Does the change follow DESIGN_SYSTEM.md and existing semantic tokens?
- Is there exactly one visually dominant primary action?
- Are empty, pending, success, failure, disabled, keyboard, mobile, and long-text states addressed as applicable?
- Does the UI show authoritative server state for financial, inventory, booking, role, and fulfillment actions?

## Operations and Delivery
- Are migrations backward compatible and is rollback possible?
- Are logs, metrics, alerts, and correlation identifiers sufficient?
- Does the change avoid local filesystem and in-memory correctness assumptions on Vercel?
- Are feature flags, runbooks, backup, restore, or secret rotation affected?

## Documentation
- Does any architecture or requirement doc need an update?
- Does SECURITY_SURFACE.md need a new route, action, webhook, or trust boundary?
- Does OPERATIONS.md need a runbook or provider decision?
