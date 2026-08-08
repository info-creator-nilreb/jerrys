import type { MetadataRoute } from "next";
import { listActiveCategoriesForStorefrontIndex } from "@/lib/catalog/category-queries";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";

export const STATIC_SITEMAP_PATHS = [
  "/",
  "/produkte",
  "/kategorien",
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
  if (!process.env.DATABASE_URL?.trim()) {
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
    if (isDatabaseUnreachable(e)) {
      return [];
    }
    throw e;
  }
}

export async function buildCategorySitemapEntries(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  if (!process.env.DATABASE_URL?.trim()) {
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
    if (isDatabaseUnreachable(e)) {
      return [];
    }
    throw e;
  }
}

export async function buildFullSitemap(
  base: string,
  now: Date = new Date(),
): Promise<MetadataRoute.Sitemap> {
  const staticEntries = buildStaticSitemapEntries(base, now);
  const productEntries = await buildProductSitemapEntries(base, now);
  const categoryEntries = await buildCategorySitemapEntries(base, now);
  return [...staticEntries, ...productEntries, ...categoryEntries];
}
