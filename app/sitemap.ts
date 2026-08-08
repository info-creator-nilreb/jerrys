import type { MetadataRoute } from "next";
import { buildFullSitemap } from "@/lib/site/sitemap-entries";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/** Regenerate periodically when DB is available (product/category slugs). */
export const revalidate = 3600;

/** Kein DB-Zugriff beim `next build` (Vercel: parallele Prerender + Supabase Session-Pool). */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = canonicalSiteOrigin();
  if (!origin) {
    return [];
  }
  return buildFullSitemap(origin);
}
