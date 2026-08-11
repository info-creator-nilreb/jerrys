/**
 * Systempfade, die nicht als ContentPage-Slug vergeben werden dürfen (Epic 12).
 * Ohne führenden Slash; Vergleich case-insensitive.
 */
export const RESERVED_CONTENT_SLUGS = [
  "admin",
  "api",
  "checkout",
  "produkte",
  "kategorien",
  "kollektionen",
  "warenkorb",
  "konto",
  "termine",
  "media",
  "branding",
  "llms.txt",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
  "_next",
  "auth",
] as const;

/** Interner Slug der Startseite; öffentliche URL ist immer `/`. */
export const CONTENT_PAGE_HOME_SLUG = "home" as const;

const reservedSet = new Set(
  RESERVED_CONTENT_SLUGS.map((s) => s.toLowerCase()),
);

export function normalizeContentSlug(raw: string): string {
  return raw
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function isReservedContentSlug(slug: string): boolean {
  const n = normalizeContentSlug(slug);
  if (!n) return true;
  if (n === CONTENT_PAGE_HOME_SLUG) return false;
  if (reservedSet.has(n)) return true;
  const first = n.split("/")[0] ?? n;
  return reservedSet.has(first);
}

/** Öffentlicher Pfad inkl. führendem Slash; Homepage → `/`. */
export function publicPathForContentSlug(slug: string): string {
  const n = normalizeContentSlug(slug);
  if (n === CONTENT_PAGE_HOME_SLUG || n === "") return "/";
  return `/${n}`;
}
