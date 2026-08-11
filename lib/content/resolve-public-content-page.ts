import {
  getPublishedContentPageByPreviousSlug,
  getPublishedContentPageBySlug,
  type ContentPageDTO,
} from "@/lib/content/content-pages";
import {
  CONTENT_PAGE_HOME_SLUG,
  isReservedContentSlug,
  normalizeContentSlug,
  publicPathForContentSlug,
} from "@/lib/content/reserved-slugs";

export type ResolvePublicContentPageResult =
  | { kind: "page"; page: ContentPageDTO }
  | { kind: "redirect"; toPath: string }
  | { kind: "not_found" };

/**
 * Öffentliche CMS-Auflösung (nur published).
 * Drafts → not_found. Alter Slug (`previousSlug`) → Redirect auf aktuellen Pfad.
 */
export async function resolvePublicContentPage(
  slugSegments: string | string[],
): Promise<ResolvePublicContentPageResult> {
  const joined = Array.isArray(slugSegments)
    ? slugSegments.join("/")
    : slugSegments;
  const slug = normalizeContentSlug(joined);

  if (!slug) return { kind: "not_found" };

  // Startseite ist `/`, nicht `/home`.
  if (slug === CONTENT_PAGE_HOME_SLUG) {
    return { kind: "redirect", toPath: "/" };
  }

  // Systempfade: Catch-all sollte sie nicht bedienen (zusätzliche Absicherung).
  if (isReservedContentSlug(slug)) {
    return { kind: "not_found" };
  }

  const page = await getPublishedContentPageBySlug(slug);
  if (page) {
    if (page.pageType === "homepage") {
      return { kind: "redirect", toPath: "/" };
    }
    return { kind: "page", page };
  }

  const relocated = await getPublishedContentPageByPreviousSlug(slug);
  if (relocated) {
    const toPath = publicPathForContentSlug(relocated.slug);
    if (toPath === `/${slug}` || toPath === slug) {
      return { kind: "not_found" };
    }
    return { kind: "redirect", toPath };
  }

  return { kind: "not_found" };
}
