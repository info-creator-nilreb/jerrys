/** Maximale Slug-Länge (Content-Schema). */
export const SLUGIFY_TITLE_MAX_LENGTH = 120;

export type SlugifyTitleMode = "catalog" | "content";

const DRAFT_PRODUCT_SLUG_PATTERN = /^entwurf-[a-z0-9]+$/;

/**
 * Erzeugt einen URL-tauglichen Slug aus einem Anzeigenamen (Titel, Produktname).
 * Umlaute werden transliteriert (ä→ae, ß→ss); nur Kleinbuchstaben, Ziffern, Bindestriche.
 */
export function slugifyTitle(
  title: string,
  mode: SlugifyTitleMode = "catalog",
  maxLength = SLUGIFY_TITLE_MAX_LENGTH,
): string {
  let slug = title
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/-+/g, "-");

  if (mode === "catalog") {
    slug = slug.replace(/\//g, "-");
  } else {
    slug = slug.replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  }

  return slug.replace(/^-+|-+$/g, "").slice(0, maxLength).replace(/^-+|-+$/g, "");
}

/** Platzhalter-Slug für neue Produkt-Entwürfe (`entwurf-…`). */
export function isDraftProductSlug(slug: string): boolean {
  return DRAFT_PRODUCT_SLUG_PATTERN.test(slug.trim().toLowerCase());
}

/** Slug wird aus dem Titel abgeleitet (leer, Entwurf oder passt zu slugifyTitle). */
export function slugFollowsTitle(
  title: string,
  slug: string,
  mode: SlugifyTitleMode = "catalog",
): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return true;
  if (mode === "catalog" && isDraftProductSlug(normalized)) return true;
  return slugifyTitle(title, mode) === normalized;
}
