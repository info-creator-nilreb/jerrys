# ADR-0010: AI content assistance port (OpenAI first)

- Status: Accepted (Epic 13, Slice 1)
- Date: 2026-08-12
- Owners: Engineering
- Epic: 13 / Slice 1

## Context

Epic 13 requires AI-assisted draft generation for product text, SEO copy, alt text, and images. Outputs must never publish or mutate catalog/CMS data without explicit admin confirmation. OpenAI is the first provider, but catalog and CMS modules must not depend on OpenAI SDKs or request shapes. Personal customer/order data and secrets must not enter prompts ([QUALITY_GUARDRAILS.md](../QUALITY_GUARDRAILS.md), [EPIC13_AI_CONTENT_ASSISTANCE.md](../EPIC13_AI_CONTENT_ASSISTANCE.md)).

## Options considered

1. **Call OpenAI directly from Admin Server Actions / product forms** — rejected: couples UI to one vendor; hard to swap providers or disable capabilities cleanly.
2. **Dedicated `features/ai` bounded context** — deferred: AI generation is an integration concern in v1; a separate module would add boundary surface without owning durable commerce aggregates.
3. **Provider-neutral port in `features/integrations` with capability checks** — chosen: matches Object Storage / label-port patterns; OpenAI lives only in infrastructure.

## Decision

1. **Owner:** `features/integrations` exposes an `AiContentPort` public API. Catalog/CMS/Admin call only that API.
2. **Capabilities are separate:** `text`, `vision`, `image_generation`, `moderation`. Callers query `supports(capability)`; unsupported actions stay disabled instead of silently falling back.
3. **First adapter:** OpenAI via server-side HTTP (`OPENAI_API_KEY` and optional model env vars). Without a key → `NotConfigured` adapter (clear errors, no network).
4. **Draft-only contract:** Port results are drafts plus provider metadata (model, capability, usage). Persistence and publish remain later slices with explicit confirm.
5. **Allowlisted facts:** Prompt builders accept only approved product/CMS fact keys. Forbidden keys (customer, order, address, secrets, …) are rejected before any provider call.
6. **Secrets:** Slice 1 uses env credentials only. Admin UI + encrypted DB keys (same pattern as Instagram / INTERNETMARKE) ship in Slice 2.
7. **Out of scope still:** Admin UI, product-form apply, CMS blocks, durable image storage of drafts, usage dashboards, second provider.

## Consequences

Positive:

- Provider swap or disable does not require catalog/CMS migrations.
- Shop works without AI credentials.
- Privacy guardrails are enforceable at the port boundary.

Negative / accepted trade-offs:

- Env-only keys until Slice 2 (no per-environment Admin rotation UI yet).
- OpenAI-specific models remain configuration, not domain concepts.

## Guardrails

- Never import OpenAI client code outside `features/integrations/infrastructure`.
- Never send customer, order, address, payment, or auth secrets in prompts.
- Never write AI output into products/CMS without an explicit confirm path (later slices).
- Rate/timeouts/cost limits belong in application orchestration before broad Admin rollout.
- Cross-module imports only via `@/features/integrations`.

## Revisit when

- A second provider adapter is required.
- Admin-stored encrypted keys replace or complement env keys.
- Semantic search (Epic 14) needs a separate embedding port (may share credentials, not this draft-content port).
