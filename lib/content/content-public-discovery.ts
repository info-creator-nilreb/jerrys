import type { ContentPageType } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import {
  CONTENT_PAGE_HOME_SLUG,
  publicPathForContentSlug,
} from "@/lib/content/reserved-slugs";

export type PublishedContentDiscoveryItem = {
  id: string;
  slug: string;
  pageType: ContentPageType;
  title: string;
  path: string;
  robotsIndex: boolean;
  updatedAt: Date;
  publishedAt: Date | null;
};

/**
 * Nur **published** ContentPages für Sitemap/Nav.
 * Drafts sind hier nie enthalten (Epic 12 Slice 4).
 */
export async function listPublishedContentPagesForDiscovery(options?: {
  /** Wenn true, nur `robotsIndex: true` (Sitemap). */
  robotsIndexOnly?: boolean;
  pageTypes?: ContentPageType[];
}): Promise<PublishedContentDiscoveryItem[]> {
  const prisma = getPrisma();
  try {
    const rows = await prisma.contentPage.findMany({
      where: {
        status: "published",
        ...(options?.robotsIndexOnly ? { robotsIndex: true } : {}),
        ...(options?.pageTypes?.length
          ? { pageType: { in: options.pageTypes } }
          : {}),
      },
      orderBy: [{ pageType: "asc" }, { slug: "asc" }],
      select: {
        id: true,
        slug: true,
        pageType: true,
        title: true,
        robotsIndex: true,
        updatedAt: true,
        publishedAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      pageType: row.pageType,
      title: row.title,
      path: publicPathForContentSlug(row.slug),
      robotsIndex: row.robotsIndex,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

/** Footer/Nav: published Content-Seiten (kein Home, keine Legal-Migration in Slice 4). */
export async function listPublishedContentNavLinks(): Promise<
  Array<{ href: string; label: string }>
> {
  const pages = await listPublishedContentPagesForDiscovery({
    pageTypes: ["content"],
  });
  return pages
    .filter((p) => p.slug !== CONTENT_PAGE_HOME_SLUG)
    .map((p) => ({ href: p.path, label: p.title }));
}
