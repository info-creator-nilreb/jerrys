import type { MetadataRoute } from "next";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

const STATIC_PATHS = [
  "/",
  "/produkte",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/rueckgabe",
  "/versand",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = canonicalSiteOrigin();
  if (!origin) {
    return [];
  }
  const base = origin.replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));

  const products = await listActiveProductsForStorefront();
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/produkte/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
