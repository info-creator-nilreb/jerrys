# ACCEPTANCE_CHECKLIST.md

Use this checklist for every meaningful implementation step.

## Architecture
- Does the change respect AGENT.md?
- Is business logic outside UI components?
- Is there any accidental coupling across modules?

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

## Side Effects
- Are emails/event side effects deduplicated?
- Are side effects logged?
- Are failures traceable?

## Quality
- TypeScript strict-safe?
- Lint passes?
- Tests added/updated?
- No unrelated refactor introduced?

## Documentation
- Does any architecture or requirement doc need an update?
