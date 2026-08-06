# ADR-0002: Vercel Deployment and Durable Infrastructure

- Status: Accepted
- Date: 2026-08-06
- Owners: Engineering and Operations

## Context

The application already targets Vercel and uses Next.js. The planned platform introduces retryable webhooks, payment reconciliation, expiring workshop reservations, Zettle synchronization, label generation, private documents, and stronger recovery requirements.

Vercel functions have an ephemeral filesystem and must not depend on process-local state for correctness.

## Options Considered

1. Replace Vercel with a container platform immediately.
2. Keep Vercel and rely only on request handlers, cron, local files, and in-memory state.
3. Keep Vercel for the application while adding managed durable data, object storage, and asynchronous execution.

## Decision

Use option 3.

Vercel remains the application and preview deployment platform. PostgreSQL remains the transactional store. Durable jobs, object storage, observability, and provider integrations are separate managed capabilities selected through follow-up ADRs before implementation.

Preview, staging, and production use isolated data and credentials.

## Consequences

Positive:

- Existing deployment knowledge and Next.js integration are retained.
- Preview deployments remain available.
- Durable concerns are assigned to services designed for them.
- A platform migration is avoided until there is evidence it is necessary.

Negative:

- Operations span several managed providers.
- Serverless connection management and runtime limits require explicit design.
- Local development needs provider fakes or emulators for durable workflows.

## Guardrails

- Do not write durable application data to the local filesystem.
- Do not use in-memory rate limits, queues, locks, or timers for correctness.
- Do not hold a database transaction open during an external provider call.
- Persist webhook input before asynchronous acknowledgement-dependent work.
- Use pooled database connections and explicit provider timeouts.
- Keep production credentials and customer data out of preview environments.
- Apply database migrations through a staged expand/contract deployment.

## Revisit When

Reconsider Vercel if measured runtime limits, cost, network topology, background execution, compliance, or operational incidents cannot be addressed by supported managed services without excessive complexity.
