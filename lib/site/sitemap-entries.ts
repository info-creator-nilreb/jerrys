import type { MetadataRoute } from "next";
import { listActiveCategoriesForStorefrontIndex } from "@/lib/catalog/category-queries";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { listPublishedContentPagesForDiscovery } from "@/lib/content/content-public-discovery";
import {
  isNextProductionBuildPhase,
  shouldSkipSitemapDatabase,
} from "@/lib/db/is-database-unreachable";

export const STATIC_SITEMAP_PATHS = [
  "/",
  "/produkte",
  "/kategorien",
  "/kollektionen",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/rueckgabe",
  "/versand",
] as const;

export function buildStaticSitemapEntries(
  base: string,
  now: Date = new Date(),
): MetadataRoute.Sitemap {
  const normalizedBase = base.replace(/\/$/, "");
  return STATIC_SITEMAP_PATHS.map((path) => ({
    url: `${normalizedBase}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : 0.7,
  }));
}

/**
 * Product URLs for sitemap. Skips DB when DATABASE_URL is unset (e.g. Vercel import
 * before env vars) or when the database is unreachable during build.
 */
export async function buildProductSitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL?.trim() || isNextProductionBuildPhase()) {
    return [];
  }

  const normalizedBase = base.replace(/\/$/, "");

  try {
    const products = await listActiveProductsForStorefront();
    return products.map((p) => ({
      url: `${normalizedBase}/produkte/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    if (e instanceof Error && e.message === "DATABASE_URL is not set") {
      return [];
    }
    if (shouldSkipSitemapDatabase(e)) {
      return [];
    }
    throw e;
  }
}

export async function buildCategorySitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL?.trim() || isNextProductionBuildPhase()) {
    return [];
  }

  const normalizedBase = base.replace(/\/$/, "");

  try {
    const categories = await listActiveCategoriesForStorefrontIndex();
    return categories.map((c) => ({
      url: `${normalizedBase}/kategorien/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch (e) {
    if (e instanceof Error && e.message === "DATABASE_URL is not set") {
      return [];
    }
    if (shouldSkipSitemapDatabase(e)) {
      return [];
    }
    throw e;
  }
}

/**
 * Published + robotsIndex ContentPages.
 * Pfade, die bereits in STATIC_SITEMAP_PATHS liegen, werden übersprungen
 * (keine Duplikate bis Slice-6-Migration die Static-Liste ersetzt).
 * Drafts erscheinen hier nie.
 */
export async function buildContentPageSitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL?.trim() || isNextProductionBuildPhase()) {
    return [];
  }

  const normalizedBase = base.replace(/\/$/, "");
  const staticPaths = new Set<string>(STATIC_SITEMAP_PATHS);

  try {
    const pages = await listPublishedContentPagesForDiscovery({
      robotsIndexOnly: true,
    });
    return pages
      .filter((p) => !staticPaths.has(p.path))
      .map((p) => ({
        url: p.path === "/" ? `${normalizedBase}/` : `${normalizedBase}${p.path}`,
        lastModified: p.updatedAt ?? now,
        changeFrequency: p.path === "/" ? ("weekly" as const) : ("monthly" as const),
        priority: p.path === "/" ? 1 : 0.6,
      }));
  } catch (e) {
    if (e instanceof Error && e.message === "DATABASE_URL is not set") {
      return [];
    }
    if (shouldSkipSitemapDatabase(e)) {
      return [];
    }
    throw e;
  }
}

export async function buildCollectionSitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL?.trim() || isNextProductionBuildPhase()) {
    return [];
  }

  const normalizedBase = base.replace(/\/$/, "");

  try {
    const collections = await listActiveCollectionsForStorefront();
    return collections
      .filter((c) => c._count.products > 0)
      .map((c) => ({
        url: `${normalizedBase}/kollektionen/${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.72,
      }));
  } catch (e) {
    if (e instanceof Error && e.message === "DATABASE_URL is not set") {
      return [];
    }
    if (shouldSkipSitemapDatabase(e)) {
      return [];
    }
    throw e;
  }
}

export async function buildDynamicSitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  const productEntries = await buildProductSitemapEntries(base, now);
  const categoryEntries = await buildCategorySitemapEntries(base, now);
  const collectionEntries = await buildCollectionSitemapEntries(base, now);
  const contentEntries = await buildContentPageSitemapEntries(base, now);
  return [...productEntries, ...categoryEntries, ...collectionEntries, ...contentEntries];
}

export async function buildFullSitemap(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  const staticEntries = buildStaticSitemapEntries(base, now);
  if (isNextProductionBuildPhase()) {
    return staticEntries;
  }
  try {
    const dynamicEntries = await buildDynamicSitemapEntries(base, now);
    return [...staticEntries, ...dynamicEntries];
  } catch (e) {
    if (shouldSkipSitemapDatabase(e)) {
      return staticEntries;
    }
    throw e;
  }
}
