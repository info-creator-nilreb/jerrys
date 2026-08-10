# Architecture Decision Records

ADRs record material decisions that constrain future implementation.

## Process

1. Copy the template below into the next numbered file.
2. Set status to `Proposed`.
3. Describe context, options, decision, consequences, and exit criteria.
4. Obtain review before changing status to `Accepted`.
5. Never rewrite an accepted decision to hide history. Supersede it with a new ADR.

## Template

```markdown
# ADR-NNNN: Decision title

- Status: Proposed
- Date: YYYY-MM-DD
- Owners: team or role

## Context

## Options considered

## Decision

## Consequences

## Guardrails

## Revisit when
```

## Index

- [ADR-0001: Modular monolith](./0001-modular-monolith.md)
- [ADR-0002: Vercel deployment and durable infrastructure](./0002-vercel-runtime.md)
- [ADR-0003: Catalog variants and collections](./0003-catalog-variants-and-collections.md)
- [ADR-0004: Product categories (browse taxonomy)](./0004-product-categories.md)
- [ADR-0005: Customer authentication (Auth.js + first-party identity)](./0005-customer-authentication.md)

Geplante ADRs (durch Agenten anzulegen):

- **ADR-0006** — ShopSettings / Branding-Singleton ([EPIC11_AGENT_HANDOFF.md](../EPIC11_AGENT_HANDOFF.md))
- **ADR-0007** — ContentPage / CMS-light Blöcke ([EPIC12_AGENT_HANDOFF.md](../EPIC12_AGENT_HANDOFF.md))
- Object Storage (falls nicht in 0002/0006 abgedeckt) vor Logo-/CMS-Bild-Uploads
