# Vercel Operations Baseline

## Deployment Topology

Vercel remains the deployment platform for the Next.js application.

Cloud build and fully remote development options are described in [CLOUD_DEVELOPMENT.md](./CLOUD_DEVELOPMENT.md). GitHub Actions is the authoritative quality pipeline; Vercel builds branch previews and production artifacts remotely when Git integration is enabled.

| Environment | Purpose | Data and providers |
| --- | --- | --- |
| Preview | Pull-request UI and isolated smoke checks | Synthetic data; no production credentials or customer data |
| Staging | Release candidate, migrations, provider sandbox, E2E | Dedicated database, storage, queue, and sandbox credentials |
| Production | Customer traffic | Production database, storage, queue, and provider credentials |

Production data must not be copied to preview. A staging copy requires an approved, documented anonymization process.

## Required Managed Capabilities

Before the relevant epic reaches production, select and record providers in ADRs for:

- PostgreSQL with connection pooling, automated backups, point-in-time recovery, and restore support
- Object storage for product media, invoices, and shipping labels
- Durable queue or workflow execution for outbox delivery, retries, reservation expiry, and reconciliation
- Error tracking, structured log aggregation, metrics, and alerting
- Transactional email
- Customer/admin authentication when customer accounts are introduced

Selection criteria include Vercel compatibility, EU data options, data-processing agreement, access control, observability, exportability, cost, and tested recovery.

## Vercel Runtime Rules

- Never rely on local filesystem persistence.
- Never rely on an in-memory timer, rate limiter, queue, or singleton for correctness.
- Use pooled database connections suitable for concurrent serverless invocations.
- Route Handlers that accept webhooks acknowledge only after durable inbox persistence.
- Long-running or retryable work is delegated to the durable job system.
- Set explicit timeouts on provider calls and avoid holding database transactions open across network requests.
- Preview deployments use separate secrets and cannot mutate production providers.

## Deployment Flow

1. Pull request runs `npm run validate`, security scans, integration tests, critical E2E tests, and Lighthouse checks.
2. Vercel builds the commit remotely; preview deployment supports UI review using synthetic data.
3. Staging applies migrations and runs provider-sandbox and migration smoke tests.
4. Production database changes follow expand/contract:
   - deploy additive schema
   - deploy compatible application code
   - backfill through a restartable job
   - verify metrics and data
   - remove old schema in a later release
5. Risky features remain disabled behind an owned feature flag until operational validation completes.
6. Rollback reverts application code without requiring an immediate destructive database rollback.

## Secrets and Access

- Separate credentials for preview, staging, and production.
- Grant each integration only required scopes.
- Restrict production secret and database access to named operators.
- Record access changes and rotate credentials after suspected exposure or staff/access changes.
- Test secret rotation before go-live and document provider-specific steps.

## Observability

Required correlation fields where applicable:

- `requestId`
- `correlationId`
- `orderId`
- `paymentId`
- `bookingId`
- `eventId`
- `provider`

Do not log full addresses, access tokens, payment credentials, label documents, raw session cookies, or unnecessary provider payloads.

Minimum alerts:

- elevated checkout/payment failure rate
- webhook signature or processing failures
- outbox or queue backlog age
- reconciliation mismatch
- negative stock or workshop capacity
- failed label purchase after retries
- database saturation or connection exhaustion
- elevated server error rate and Core Web Vitals regression

## Backup and Recovery

- Enable automated backups and point-in-time recovery for production.
- Document retention and restore ownership.
- Restore into an isolated environment; never overwrite production as the first recovery step.
- Verify schema, representative order/payment/booking records, and application startup after restore.
- Target RPO: 15 minutes. Target RTO: 4 hours.
- Run a restore exercise before go-live and at least twice per year.

## Required Runbooks

Create and test these before their associated feature is enabled:

- failed deployment and application rollback
- database restore
- secret rotation
- provider outage
- successful external payment with incomplete internal finalization
- webhook or outbox backlog
- stuck or expired workshop reservations
- Zettle inventory discrepancy
- INTERNETMARKE/DHL label purchase failure
- personal-data incident and data-subject request

## Open Epic 0 Decisions

The architecture is fixed; product choices remain deliberately open until evaluated:

- managed PostgreSQL provider
- object storage provider and retention implementation
- durable queue/workflow provider
- authentication provider or retained Auth.js design
- error tracking, logs, metrics, and alert routing

Each selection requires an ADR before implementation. Product selection must not be hidden inside a feature pull request.
