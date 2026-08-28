import "server-only";

import { getShopifyPublicImageIndex } from "@/lib/catalog/shopify-public-product-images";
import { resolveShopifyPublicOrigin } from "@/lib/catalog/shopify-public-origin";
import { normalizeStorefrontProductImageUrl } from "@/lib/catalog/storefront-product-image";
import { isUsableStoredProductImageUrl } from "@/lib/catalog/usable-product-image-url";
import {
  collectBlockedBlobHosts,
  urlHostIsBlocked,
} from "@/lib/catalog/blob-host-reachability";
import { getShopSettings } from "@/lib/shop/shop-settings";

type ImageRow = { url: string; alt: string };

function usableImages(images: ImageRow[], blockedHosts: Set<string>): ImageRow[] {
  const out: ImageRow[] = [];
  for (const img of images) {
    if (!isUsableStoredProductImageUrl(img.url)) continue;
    if (urlHostIsBlocked(img.url, blockedHosts)) continue;
    const url = normalizeStorefrontProductImageUrl(img.url);
    if (!url) continue;
    out.push({ ...img, url, alt: img.alt });
  }
  return out;
}

async function shopifyIndexForCurrentShop(): Promise<Record<string, ImageRow[]> | null> {
  try {
    const settings = await getShopSettings();
    const origin = resolveShopifyPublicOrigin(settings.shopName);
    if (!origin) return null;
    return await getShopifyPublicImageIndex(origin);
  } catch {
    return null;
  }
}

export async function attachShopifyFallbackImages<
  T extends { slug: string; images: ImageRow[] },
>(products: T[]): Promise<T[]> {
  if (products.length === 0) return products;
  const blockedHosts = await collectBlockedBlobHosts(
    products.flatMap((p) => p.images.map((img) => img.url)),
  );
  const mapped = products.map((p) => ({ ...p, images: usableImages(p.images, blockedHosts) }));
  if (mapped.every((p) => p.images.length > 0)) return mapped;

  const index = await shopifyIndexForCurrentShop();
  if (!index) return mapped;

  return mapped.map((p) => {
    if (p.images.length > 0) return p;
    const fallback = index[p.slug] ?? [];
    if (fallback.length === 0) return p;
    return {
      ...p,
      images: fallback.map((img, i) => ({
        id: `shopify-fallback:${p.slug}:${i}`,
        url: img.url,
        alt: img.alt,
        sortOrder: i,
        isCover: i === 0,
      })),
    } as T;
  });
}

export async function attachShopifyFallbackImagesToProduct<
  T extends { slug: string; images: ImageRow[] },
>(product: T | null): Promise<T | null> {
  if (!product) return null;
  const [enriched] = await attachShopifyFallbackImages([product]);
  return enriched ?? product;
}
