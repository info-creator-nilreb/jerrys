import "server-only";

import { unstable_cache } from "next/cache";
import { normalizeStorefrontProductImageUrl } from "@/lib/catalog/storefront-product-image";

export type ShopifyPublicProductImage = { url: string; alt: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseImages(raw: unknown, fallbackAlt: string): ShopifyPublicProductImage[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopifyPublicProductImage[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    const src = typeof row?.src === "string" ? row.src : "";
    const url = normalizeStorefrontProductImageUrl(src);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const alt = typeof row?.alt === "string" && row.alt.trim() ? row.alt.trim() : fallbackAlt;
    out.push({ url, alt });
  }
  return out;
}

async function fetchShopifyProductsPage(
  origin: string,
  page: number,
): Promise<Array<{ handle: string; title: string; images: unknown }>> {
  const url = new URL("/products.json", origin);
  url.searchParams.set("limit", "250");
  url.searchParams.set("page", String(page));
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "jerrys-catalog-image-backfill/1.0" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json: unknown = await res.json().catch(() => null);
    const root = asRecord(json);
    const products = Array.isArray(root?.products) ? root.products : [];
    const out: Array<{ handle: string; title: string; images: unknown }> = [];
    for (const raw of products) {
      const row = asRecord(raw);
      const handle = typeof row?.handle === "string" ? row.handle.trim().toLowerCase() : "";
      if (!handle) continue;
      out.push({
        handle,
        title: typeof row?.title === "string" ? row.title : handle,
        images: row?.images,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadShopifyPublicImageIndex(
  origin: string,
): Promise<Record<string, ShopifyPublicProductImage[]>> {
  const index: Record<string, ShopifyPublicProductImage[]> = {};
  const base = origin.replace(/\/$/, "");
  for (let page = 1; page <= 4; page++) {
    const rows = await fetchShopifyProductsPage(base, page);
    if (rows.length === 0) break;
    for (const row of rows) {
      const images = parseImages(row.images, row.title);
      if (images.length > 0) index[row.handle] = images;
    }
    if (rows.length < 250) break;
  }
  return index;
}

export const getShopifyPublicImageIndex = unstable_cache(
  loadShopifyPublicImageIndex,
  ["shopify-public-product-images"],
  { revalidate: 3600 },
);
