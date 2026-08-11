# ADR-0006: ShopSettings branding singleton

- Status: Accepted (Epic 11, Slice 1)
- Date: 2026-08-11
- Owners: Engineering
- Epic: 11 / Slice 1

## Context

Branding and public business identity (shop name, primary colors, contact/address, social links, email sender label, future logo/favicon/OG URLs) are hardcoded across CSS, storefront layout, transactional email, and invoice PDFs. Epic 11 requires **one active branding configuration** per installation, editable later under `/admin/einstellungen` without redeploy.

Existing singletons (`ShopShippingSettings`, `ShopWorkshopSettings`) prove the `id = "default"` pattern. Homepage admin (`/admin/startseite`) covers marketing widgets only and must not become the branding store. Object storage for uploads remains out of scope for Slice 1 (see ADR-0002 ephemeral filesystem guardrails).

## Options considered

1. **Environment variables / `next.config` theme** — rejected: operators cannot change branding without redeploy; no audit trail; poor fit for contact/address copy.
2. **Reuse `ShopShippingSettings` or homepage tables** — rejected: wrong bounded concern; couples shipping or marketing CMS to identity.
3. **Dedicated `ShopSettings` singleton row** — chosen: one authoritative Postgres row, Zod-validated fields, seed from today’s jerry’s defaults, expandable for asset URLs once durable storage exists.

## Decision

1. **`shop_settings` table / Prisma `ShopSettings`**: singleton with `id = "default"` (same pattern as workshop/shipping settings).
2. **Slice 1 fields**: shop name, short description, primary + primary-hover hex colors, contact/support email and phone, legal/business address, VAT id, curated social URL fields, email-from display name, nullable public asset URL placeholders (logo light/dark, favicon, OG) without upload pipeline.
3. **Validation**: Zod schemas enforce `#RRGGBB` colors, email/URL shapes, trimmed lengths, and ISO country; no free-form CSS or JavaScript. WCAG 2.2 contrast helpers evaluate white-on-primary and primary-on-white; Slice 1 **warns** (does not block seed/migration of the existing jerry’s green). Admin save (later slice) must surface warnings and may block unsafe combinations.
4. **Defaults / seed**: today’s jerry’s values (`jerry's`, `#8bbe25` / `#74a320`, impressum contact placeholders, Instagram URL) are seeded and used as in-code fallback if the row is missing.
5. **Cache / revalidation strategy**:
   - Cache tag constant: `shop-settings` (`SHOP_SETTINGS_CACHE_TAG`).
   - Slice 1 exposes read helpers without requiring Cache Components.
   - When storefront/email/PDF consumers start caching (Slice 4+), they tag entries with `cacheTag('shop-settings')` or equivalent `unstable_cache` tags.
   - Admin mutations (Slice 3) call `updateTag('shop-settings')` for read-your-own-writes and may additionally `revalidateTag('shop-settings', 'max')` / `revalidatePath` for broader surfaces.
6. **Out of scope for Slice 1**: Admin UI, object-storage uploads, applying CSS variables in the storefront, email/PDF/login consumers, multi-theme / white-label.

## Consequences

Positive:

- Branding becomes data, migratable and auditable later, without changing shipping or homepage models.
- Existing visual defaults remain the migration baseline (Epic 11 exit criterion).
- Clear cache tag for later storefront integration.

Negative / accepted trade-offs:

- CSS defaults in `globals.css` remain as build-time fallbacks; runtime overrides come from Settings (Root-Layout).
- Contrast failures warn in Admin; hard-blocking AA remains a product decision.
- Asset URL columns are filled via Vercel Blob ([ADR-0008](./0008-object-storage.md)).

## Guardrails

- Exactly one logical settings document (`id = "default"`); no multi-tenant themes.
- Never persist free CSS/JS from admins.
- Do not store uploads on the Vercel filesystem (ADR-0002).
- Missing or invalid assets must not break checkout, mail, or PDF (static `/branding/*` / text fallbacks).
- Cross-cutting readers live under `lib/shop/` until a dedicated bounded-context export is justified.

## Revisit when

- Admin contrast policy hard-blocks colors that fail AA for primary button text.
- Multiple shops or white-label themes are explicitly approved (currently out of scope).
- Private object storage for invoices/labels is chosen (separate from public Blob).
