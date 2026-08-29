import "server-only";

import { unstable_cache } from "next/cache";
import { extractShopifyLogoUrlFromHtml } from "@/lib/shop/shopify-public-logo";

async function loadShopifyHeaderLogoUncached(origin: string): Promise<string | null> {
  const base = origin.replace(/\/$/, "");
  try {
    const res = await fetch(base, {
      headers: { Accept: "text/html", "User-Agent": "jerrys-storefront-logo/1.0" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractShopifyLogoUrlFromHtml(html, base);
  } catch {
    return null;
  }
}

export const getShopifyHeaderLogoUrl = unstable_cache(
  loadShopifyHeaderLogoUncached,
  ["shopify-public-header-logo"],
  { revalidate: 3600 },
);
