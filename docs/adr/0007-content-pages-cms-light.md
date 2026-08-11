# ADR-0007: Content pages and CMS-light blocks

- Status: Accepted (Epic 12, Slice 1)
- Date: 2026-08-11
- Owners: Engineering
- Epic: 12 / Slice 1

## Context

The storefront homepage and several content/legal pages are hardwired in the App Router plus dedicated `homepage_*` tables for marketing widgets. Epic 12 requires a **curated** CMS: typed pages with ordered blocks, draft/published status, SEO fields, and later migration of `/` and legal URLs — without a generic page builder, free HTML/CSS/JS, or version history.

Epic 11 already provides durable public branding assets ([ADR-0008](./0008-object-storage.md)). Block rendering, admin editor, preview tokens, and free-page routing remain later slices.

## Options considered

1. **Extend `/admin/startseite` + `homepage_*` only** — rejected: cannot represent arbitrary content/legal pages, SEO, or draft/publish for non-home URLs.
2. **Full headless CMS (third-party)** — rejected: ops cost, weaker control over sanitization/reserved paths, conflicts with modular monolith ([ADR-0001](./0001-modular-monolith.md)).
3. **First-party `ContentPage` + ordered `ContentBlock` rows** — chosen: Postgres source of truth, Zod-validated block payloads (Slice 2+), reserved-path guards, migration of existing URLs in a later slice.

## Decision

1. **`content_pages` / Prisma `ContentPage`**: `pageType` (`homepage` | `content` | `legal`), `status` (`draft` | `published`), unique `slug`, title, SEO fields (`seoTitle`, `seoDescription`, `ogImageUrl`, `canonicalPath`, `robotsIndex`), optional `previousSlug` for redirect planning, `publishedAt`.
2. **Homepage convention**: at most one row with `pageType = homepage`; stored slug is the sentinel `home` (public URL remains `/`). Other pages use URL path segments without leading slash (e.g. `impressum`).
3. **`content_blocks` / Prisma `ContentBlock`**: `pageId`, `type` (registry key string), `sortOrder`, `data` (JSON). Slice 1 stores opaque JSON; Slice 2 adds per-type Zod schemas and a Server Component registry.
4. **v1 block type keys** (registry contract): `hero`, `richText`, `imageText`, `productCategoryPick`, `curatedProductList`, `uspStrip`, `faq`, `socialReviews`, `workshopCalendar`.
5. **Reserved slugs**: system paths (`admin`, `api`, `checkout`, `produkte`, …) cannot be used as page slugs; enforced in Zod helpers from Slice 1.
6. **Cache**: tag constant `content-pages` for later storefront/admin invalidation.
7. **Out of scope for Slice 1**: public renderer, admin editor, preview URLs, free-page catch-all routing, migration of homepage/legal HTML, workshop calendar block wiring.

## Consequences

Positive:

- Clear data model for draft/publish and SEO before UI work.
- Legal vs content page types allow stricter sanitization later without schema churn.
- Homepage/marketing tables can coexist until Slice 6 migration.

Negative / accepted trade-offs:

- Dual homepage sources until migration (`homepage_*` + future CMS home).
- Block `data` is untyped at the DB layer; application Zod is the contract.

## Guardrails

- No free React/HTML/CSS/JS execution from admin input.
- Drafts must never appear in public routes, sitemap, or navigation (enforced when routing ships).
- Exactly one `homepage` page type row when seeded/migrated.
- Rich text sanitization is mandatory before any public render (Slice 2+).
- Uploads for block images use durable object storage (ADR-0008), never Vercel FS.

## Preview tokens (Slice 4)

- Format: `v1.<base64url(pageId)>.<expUnix>.<hmac-sha256>` (HMAC over `v1.id.exp`).
- Secret: `CONTENT_PREVIEW_SECRET` if set, otherwise `AUTH_SECRET` / `NEXTAUTH_SECRET`.
- TTL: 30 minutes (`CONTENT_PREVIEW_TTL_SECONDS`); stateless (no DB token rows).
- Route: `/vorschau/inhalte/[pageId]?token=…` — `robots: noindex`, `robots.txt` disallows `/vorschau/`; invalid/expired token → **404** (no auth session required, no existence distinction beyond path).
- Public discovery (`listPublishedContentPagesForDiscovery`) and sitemap/nav helpers never include `draft`.

## Revisit when

- Multi-language content is approved (currently out of scope).
- Version history or collaborative editing is explicitly requested.
