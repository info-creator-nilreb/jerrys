# ADR-0008: Object storage (Vercel Blob)

- Status: Accepted (Epic 11, Slice 2)
- Date: 2026-08-11
- Owners: Engineering and Operations
- Epic: 11 / Slice 2

## Context

ADR-0002 keeps the app on Vercel and forbids durable writes to the ephemeral function filesystem. Product images and homepage social uploads currently write under `public/media/**`, which is lost on redeploy. Epic 11 branding (logo, favicon, OG) and later Epic 12 CMS media require durable object storage before production uploads.

Preview, staging, and production need isolated stores or at least path prefixes and separate tokens.

## Options considered

1. **Continue writing to `public/` on the Vercel filesystem** — rejected: violates ADR-0002; assets disappear on deploy/restart.
2. **Supabase Storage** — already used for Postgres; would reuse the vendor, but adds a second public CDN surface, bucket/policy setup, and service-role secrets alongside existing Auth.js (not Supabase Auth) paths.
3. **AWS S3 / Cloudflare R2 / generic S3** — flexible, but more IAM/ops for a boutique shop already on Vercel.
4. **Vercel Blob (public store for storefront assets)** — chosen: native Vercel integration (`BLOB_READ_WRITE_TOKEN` / OIDC), public URLs for logos and OG images, SDK fits Server Actions / Route Handlers.

## Decision

1. **Provider:** Vercel Blob for **public** storefront and branding assets (logos, favicon, OG, future CMS/public catalog media).
2. **Access model:** Branding and public media use a **public** Blob store (`access: 'public'`). Private documents (invoices, shipping labels) remain a later private-store concern and are out of Slice 2.
3. **Application port:** `features/integrations` exposes an `ObjectStorage` port (`putPublic`, `deleteByUrl`, `isConfigured`). Callers never import `@vercel/blob` outside the infrastructure adapter.
4. **Branding pathnames:** `branding/{assetKind}/{uuid}.{ext}` with server-side MIME, size, magic-byte, and light dimension checks before upload.
5. **Configuration:** `BLOB_READ_WRITE_TOKEN` (and store linkage on Vercel). When unset, uploads fail clearly; **reads** fall back to static `/branding/*` assets so checkout/mail/PDF do not break.
6. **Migration:** Existing local `public/media/**` uploads are not bulk-migrated in Slice 2; new branding uploads go to Blob. Product/homepage upload paths may move in a follow-up.

## Consequences

Positive:

- Branding uploads survive deploys and match Epic 11 exit criteria.
- Storage choice is recorded before Admin UI (Slice 3) and CMS images (Epic 12).
- Fallbacks keep the shop operable without Blob in local/dev.

Negative / accepted trade-offs:

- Another Vercel Marketplace dependency and token to rotate.
- Private Blob for invoices/labels needs a second store or access mode later.
- Legacy `public/media/**` writers remain until migrated.

## Guardrails

- Never persist durable media with `fs.writeFile` under `public/` for new branding (or CMS) uploads.
- Validate type, size, and image integrity on the server before `put`.
- Do not expose write tokens to the browser; server-side `put` (or tokenized client upload with server `handleUpload`) only.
- Isolate preview vs production stores or pathname prefixes.
- Missing Blob config must not crash storefront rendering; use static fallbacks.

## Revisit when

- Private document storage (invoices, labels) is implemented.
- Cost, egress, or region requirements favor S3-compatible storage.
- Bulk migration of existing `public/media/**` product images is scheduled.
