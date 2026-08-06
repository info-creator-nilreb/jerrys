import type { MetadataRoute } from "next";
import { buildFullSitemap } from "@/lib/site/sitemap-entries";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/** Regenerate periodically when DB is available (product slugs). */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = canonicalSiteOrigin();
  if (!origin) {
    return [];
  }
  return buildFullSitemap(origin);
}
