# ADR-0005: Customer authentication (Auth.js + first-party identity)

- Status: Accepted
- Date: 2026-08-08
- Owners: Engineering
- Epic: 3 / Slice 1

## Context

Epic 3 requires secure customer registration and sign-in with **password** and **magic link**, email verification, password reset, session handling, and rate limits. Guest checkout must remain available without an account. Guest-order attachment is deferred to Slice 4 and must never rely on email matching alone.

Admin authentication already uses **Auth.js (NextAuth v5)** with Credentials + JWT on Vercel. Epic 0 left the customer auth product choice open until an ADR evaluated Auth.js retention versus Clerk, Descope, or Auth0 (cost, EU processing, magic-link delivery, exportability, Vercel operations).

## Options considered

1. **Clerk / Descope / Auth0 (hosted IdP)**  
   Faster UI kits and MFA roadmap, but adds SaaS cost, subprocessors, DPA/region review, and a second identity store. Magic-link delivery and customer export would depend on the vendor. Overlaps awkwardly with the existing Auth.js admin path.

2. **Separate customer-only auth stack (e.g. Lucia / custom cookies)**  
   Full control, but duplicates session/CSRF/cookie hardening already solved for admin and increases maintenance surface.

3. **Retain Auth.js for customers; store identities in our Postgres**  
   Reuses proven Vercel wiring (`AUTH_SECRET`, Node handlers, rate-limit hook), keeps PII in the shop database (EU region follows our Postgres choice), sends magic/verify/reset mail through the existing Resend transactional path, and stays exportable for privacy workflows (Slice 6).

## Decision

Choose option 3.

1. **Auth.js** remains the browser session mechanism for both admin and customers. JWT sessions carry an explicit `subjectKind`: `admin` | `customer`.
2. **First-party models** in the `customers` bounded context:
   - `Customer` — profile + optional `passwordHash` + `emailVerifiedAt`
   - `CustomerIdentity` — provider binding (`password`, `magic_link`, …) so identity is not inferred from order emails
   - `CustomerAuthToken` — hashed one-time tokens for `email_verify`, `magic_link`, `password_reset`
3. **Providers**: keep default Credentials for admin; add `customer-credentials` and `customer-magic-link`. Magic link, verification, and reset emails use `sendTransactionalEmail` (Resend), not a hosted IdP.
4. **Authorization**: admin UI/APIs accept only `subjectKind === "admin"` (legacy JWTs without the claim remain admin). Customer account routes accept only `subjectKind === "customer"`.
5. **Guest checkout** stays anonymous; `Order` gains no required customer foreign key in Slice 1. Slice 4 may attach verified guest orders later.
6. **Out of scope for Slice 1**: social login, MFA, customer impersonation, workshop booking UI (Epic 5), address book, order portal beyond a minimal signed-in landing.

## Consequences

Positive:

- No new auth SaaS or dual session stacks for Slice 1.
- Customer PII and auth tokens stay in PostgreSQL under our migrations and privacy workflows.
- Rate limits, logging, and Resend delivery reuse existing patterns.

Negative / accepted trade-offs:

- One Auth.js cookie means admin and customer sessions replace each other (acceptable for this boutique shop).
- Magic-link UX and deliverability are our operational responsibility (Resend + `MAIL_FROM`).
- MFA and advanced bot protection remain future work.

## Guardrails

- Never merge or expose orders based on unverified email alone.
- Store only **hashes** of auth tokens; raw tokens appear only in emails.
- Do not log raw tokens, passwords, or full magic-link URLs.
- Password login requires `emailVerifiedAt` and `isActive`.
- Auth endpoints (register, login, magic link, reset) must be rate-limited.
- Cross-module code uses `@/features/customers` public API only.
- Do not change guest checkout behavior in this ADR’s Slice 1 implementation.

## Revisit when

- MFA or passkeys become a release requirement. Admin TOTP self-service is proposed in [ADR-0011](./0011-admin-self-service-security.md); customer MFA remains out of scope.
- Measured abuse or deliverability issues justify a hosted IdP.
- Admin and customer sessions must coexist in one browser without sign-out.
- A compliance review requires an external IdP with a specific certification.
