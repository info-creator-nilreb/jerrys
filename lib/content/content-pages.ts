import type { ContentPageStatus, ContentPageType, Prisma } from "@/app/generated/prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { CONTENT_PAGES_CACHE_TAG } from "@/lib/content/content-pages-cache-tag";
import {
  CONTENT_PAGE_HOME_SLUG,
  normalizeContentSlug,
} from "@/lib/content/reserved-slugs";

export type ContentBlockDTO = {
  id: string;
  type: string;
  sortOrder: number;
  data: Prisma.JsonValue;
  updatedAt: Date;
};

export type ContentPageDTO = {
  id: string;
  slug: string;
  pageType: ContentPageType;
  status: ContentPageStatus;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  canonicalPath: string | null;
  robotsIndex: boolean;
  showInFooter: boolean;
  previousSlug: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  blocks: ContentBlockDTO[];
};

function toBlockDto(row: {
  id: string;
  type: string;
  sortOrder: number;
  data: Prisma.JsonValue;
  updatedAt: Date;
}): ContentBlockDTO {
  return {
    id: row.id,
    type: row.type,
    sortOrder: row.sortOrder,
    data: row.data,
    updatedAt: row.updatedAt,
  };
}

function toPageDto(
  row: {
    id: string;
    slug: string;
    pageType: ContentPageType;
    status: ContentPageStatus;
    title: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    canonicalPath: string | null;
    robotsIndex: boolean;
    showInFooter: boolean;
    previousSlug: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    blocks?: Array<{
      id: string;
      type: string;
      sortOrder: number;
      data: Prisma.JsonValue;
      updatedAt: Date;
    }>;
  },
): ContentPageDTO {
  const blocks = [...(row.blocks ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map(toBlockDto);
  return {
    id: row.id,
    slug: row.slug,
    pageType: row.pageType,
    status: row.status,
    title: row.title,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    canonicalPath: row.canonicalPath,
    robotsIndex: row.robotsIndex,
    showInFooter: row.showInFooter,
    previousSlug: row.previousSlug,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    blocks,
  };
}

const pageInclude = {
  blocks: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
};

/**
 * Liest eine ContentPage inkl. Blöcke. Slice 1: kein öffentliches Routing —
 * Drafts und Published sind gleichermaßen lesbar für spätere Admin-Pfade.
 */
export async function getContentPageBySlug(
  slug: string,
): Promise<ContentPageDTO | null> {
  const prisma = getPrisma();
  try {
    const row = await prisma.contentPage.findUnique({
      where: { slug },
      include: pageInclude,
    });
    return row ? toPageDto(row) : null;
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

/**
 * Öffentlicher Lesepfad: nur `published`. Drafts → null (kein Leak über Existenz).
 */
export async function getPublishedContentPageBySlug(
  slug: string,
): Promise<ContentPageDTO | null> {
  const page = await getContentPageBySlug(slug);
  if (!page || page.status !== "published") return null;
  return page;
}

/**
 * Published Seite, deren `previousSlug` dem Pfad entspricht (301-Ziel ermitteln).
 */
export async function getPublishedContentPageByPreviousSlug(
  previousSlug: string,
): Promise<ContentPageDTO | null> {
  const normalized = normalizeContentSlug(previousSlug);
  if (!normalized) return null;
  const prisma = getPrisma();
  try {
    const row = await prisma.contentPage.findFirst({
      where: { previousSlug: normalized, status: "published" },
      include: pageInclude,
    });
    return row ? toPageDto(row) : null;
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

export async function getContentPageById(
  id: string,
): Promise<ContentPageDTO | null> {
  const prisma = getPrisma();
  try {
    const row = await prisma.contentPage.findUnique({
      where: { id },
      include: pageInclude,
    });
    return row ? toPageDto(row) : null;
  } catch (e) {
    if (isMissingSchemaError(e)) return null;
    throw e;
  }
}

type ContentPageCached = Omit<ContentPageDTO, "publishedAt" | "updatedAt" | "blocks"> & {
  publishedAt: string | null;
  updatedAt: string;
  blocks: Array<Omit<ContentBlockDTO, "updatedAt"> & { updatedAt: string }>;
};

function serializeContentPage(page: ContentPageDTO): ContentPageCached {
  return {
    ...page,
    publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
    updatedAt: page.updatedAt.toISOString(),
    blocks: page.blocks.map((b) => ({
      ...b,
      updatedAt: b.updatedAt.toISOString(),
    })),
  };
}

function reviveContentPage(page: ContentPageCached): ContentPageDTO {
  return {
    ...page,
    publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
    updatedAt: new Date(page.updatedAt),
    blocks: page.blocks.map((b) => ({
      ...b,
      updatedAt: new Date(b.updatedAt),
    })),
  };
}

const getCachedHomepageContentPage = unstable_cache(
  async (): Promise<ContentPageCached | null> => {
    const page = await getContentPageBySlug(CONTENT_PAGE_HOME_SLUG);
    return page ? serializeContentPage(page) : null;
  },
  ["content-page-home"],
  { tags: [CONTENT_PAGES_CACHE_TAG], revalidate: 60 },
);

/** Startseiten-CMS-Zeile falls vorhanden (Slug `home`). Request-dedupliziert + kurz gecacht. */
export const getHomepageContentPage = cache(
  async (): Promise<ContentPageDTO | null> => {
    const cached = await getCachedHomepageContentPage();
    return cached ? reviveContentPage(cached) : null;
  },
);

export async function listContentPages(options?: {
  status?: ContentPageStatus;
  pageType?: ContentPageType;
}): Promise<Omit<ContentPageDTO, "blocks">[]> {
  const prisma = getPrisma();
  try {
    const rows = await prisma.contentPage.findMany({
      where: {
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.pageType ? { pageType: options.pageType } : {}),
      },
      orderBy: [{ pageType: "asc" }, { slug: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      pageType: row.pageType,
      status: row.status,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      ogImageUrl: row.ogImageUrl,
      canonicalPath: row.canonicalPath,
      robotsIndex: row.robotsIndex,
      showInFooter: row.showInFooter,
      previousSlug: row.previousSlug,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

export {
  CONTENT_PAGE_HOME_SLUG,
  RESERVED_CONTENT_SLUGS,
  isReservedContentSlug,
  normalizeContentSlug,
  publicPathForContentSlug,
} from "@/lib/content/reserved-slugs";
export {
  CONTENT_BLOCK_TYPES,
  isContentBlockType,
  type ContentBlockType,
} from "@/lib/content/block-types";
export { CONTENT_PAGES_CACHE_TAG } from "@/lib/content/content-pages-cache-tag";
export {
  revalidateContentPagesCache,
  updateContentPagesCacheTag,
} from "@/lib/content/content-pages-cache";
export {
  contentPageValuesSchema,
  parseContentBlockShell,
  parseContentPageValues,
  type ContentBlockShell,
  type ContentPageValues,
} from "@/lib/content/content-page-schemas";
export {
  CONTENT_BLOCK_SCHEMAS,
  parseContentBlockData,
  resolveContentBlockSchema,
} from "@/lib/content/block-schemas";
