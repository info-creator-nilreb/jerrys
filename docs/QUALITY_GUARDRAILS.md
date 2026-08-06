# Quality Guardrails

These guardrails are release criteria, not optional guidance. A deviation requires a time-bounded exception documented in an ADR or pull request with owner, risk, mitigation, and expiry date.

## Privacy

- Collect personal data only for a documented contract, workshop, fulfillment, support, legal, or consent purpose.
- Maintain purpose, legal basis, recipients, and retention for every personal-data category.
- Do not store raw payment credentials. Use provider-hosted or tokenized payment methods.
- Store consent with purpose, policy version, timestamp, and revocation evidence. Marketing consent is separate from transactional communication.
- Provide an authenticated or manually verified process for access, export, correction, restriction, and deletion requests.
- Preserve legally required invoice and order records through access restriction or pseudonymization rather than unlawful deletion.
- Do not place personal data in URLs, analytics dimensions, error-reporting context, or unredacted logs.
- Raw provider payloads and shipping labels have explicit short retention periods.
- Review data-processing agreements, subprocessors, data regions, and international transfers before enabling a provider in production.

Pull request evidence:

- Data categories and purpose identified.
- Retention and deletion behavior defined.
- Authorization and privacy tests added for affected data.
- Privacy notice or processing inventory update identified.

## Security

- Target OWASP ASVS Level 2 controls for internet-facing and administrative functionality.
- Enforce authorization server-side at routes, actions, and application services.
- Require MFA-capable admin authentication and least-privilege roles before expanding production administration.
- Use `HttpOnly`, `Secure`, and appropriate `SameSite` session cookies; protect state-changing browser operations against CSRF.
- Validate every external input at runtime. Never trust client-provided prices, totals, availability, roles, or provider status.
- Verify webhook signatures and timestamp windows before parsing business data. Deduplicate and protect against replay.
- Apply distributed rate limits to authentication, checkout, voucher, reservation, and public-form endpoints.
- Keep secrets in environment secret stores, separate per environment, absent from logs and client bundles, and subject to rotation.
- Audit critical changes to roles, money, stock, booking capacity, refunds, and fulfillment.
- CI must run lint, typecheck, tests, SAST, secret scanning, and high-severity dependency audit.

Release blockers:

- Known exploitable critical or high-severity vulnerability without an approved exception.
- Missing server-side authorization for protected data or mutation.
- Unverified payment or fulfillment webhook.
- Secret exposure or personal data in logs.

## Updateability

- Provider code lives behind module-owned adapter interfaces; UI and domain rules do not import provider SDKs.
- Use supported Node.js, Next.js, React, PostgreSQL, and Prisma versions.
- Review automated dependency updates at least monthly; expedite security patches according to severity.
- All update pull requests run build, typecheck, unit, integration, architecture, and critical E2E checks.
- Record material architecture and provider-version decisions as ADRs.
- Version public module contracts and external event schemas when compatibility cannot be preserved.
- Apply database schema changes through migrations using expand/contract for non-atomic changes.
- Every destructive migration requires backup evidence, rollback procedure, and explicit approval.
- Risky functionality uses an owned feature flag with a removal date.
- Provider sandbox fixtures and contract tests detect incompatible API changes.

## Performance

Production targets at the 75th percentile:

- Largest Contentful Paint: at most 2.5 seconds
- Interaction to Next Paint: at most 200 milliseconds
- Cumulative Layout Shift: at most 0.1

Application targets under expected normal load:

- Read API p95: at most 500 milliseconds
- Internal checkout processing p95: at most 1.5 seconds, excluding external provider latency
- Storefront monthly availability: at least 99.9 percent

Engineering rules:

- Prefer Server Components and server rendering. Add client JavaScript only for required interaction.
- Public catalog content may be safely cached; personalized, payment, booking, and administrative responses must not enter public caches.
- Optimize images with responsive dimensions, modern formats, and stable layout dimensions.
- Paginate list views and index production query patterns.
- Review new data access for N+1 behavior and unbounded result sets.
- Give provider calls explicit timeouts and bounded retries with exponential backoff and jitter.
- Move slow, retryable side effects to durable jobs.
- Keep Lighthouse budgets in CI and add load tests for checkout, webhooks, and concurrent workshop reservations.

## Reliability and Data Integrity

- Critical commands have idempotency keys with unique database enforcement.
- Payment, stock, and workshop capacity transitions use atomic database operations.
- Browser redirects are not authoritative provider confirmation.
- Side effects are persisted through an outbox before publication.
- Consumers can process duplicate or reordered external events safely.
- Reconciliation detects externally successful but internally incomplete payments.
- Backups use point-in-time recovery where available. Restore exercises occur before go-live and at least twice per year.
- Target recovery point objective: 15 minutes. Target recovery time objective: 4 hours.

## Definition of Done

Every meaningful story includes:

- Acceptance criteria and explicit out-of-scope items
- Type-safe implementation with runtime input validation
- Unit, integration, E2E, security, contract, or load tests proportional to risk
- Logs, metrics, and alerts for operationally significant behavior
- Privacy and security review of affected data and trust boundaries
- Migration, rollback, and feature-flag plan where applicable
- Updated architecture, API surface, runbook, and user-facing documentation
- Passing `npm run validate`
