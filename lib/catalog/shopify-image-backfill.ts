import "server-only";

import { getPrisma } from "@/lib/db/prisma";
import { getShopifyPublicImageIndex } from "@/lib/catalog/shopify-public-product-images";
import { resolveShopifyPublicOrigin } from "@/lib/catalog/shopify-public-origin";
import { isUsableStoredProductImageUrl } from "@/lib/catalog/usable-product-image-url";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("catalog.shopify-image-backfill");

export type ShopifyImageBackfillResult = {
  skipped: boolean;
  reason?: string;
  scanned: number;
  filled: number;
};

/**
 * Schreibt fehlende/unbrauchbare Produktbilder aus der öffentlichen Shopify-JSON-API in den Cache.
 */
export async function backfillMissingProductImagesFromShopify(): Promise<ShopifyImageBackfillResult> {
  const settings = await getShopSettings();
  const origin = resolveShopifyPublicOrigin(settings.shopName);
  if (!origin) {
    return { skipped: true, reason: "no_shopify_origin", scanned: 0, filled: 0 };
  }

  let index: Record<string, { url: string; alt: string }[]>;
  try {
    index = await getShopifyPublicImageIndex(origin);
  } catch (e) {
    log.warn("shopify_public_index_failed", errorMeta(e));
    return { skipped: true, reason: "fetch_failed", scanned: 0, filled: 0 };
  }

  const products = await getPrisma().product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      images: { select: { id: true, url: true } },
    },
    take: 400,
  });

  let filled = 0;
  const prisma = getPrisma();
  for (const product of products) {
    const usable = product.images.filter((img) => isUsableStoredProductImageUrl(img.url));
    if (usable.length > 0) continue;
    const fallback = index[product.slug] ?? [];
    if (fallback.length === 0) continue;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({
          data: fallback.map((img, i) => ({
            productId: product.id,
            url: img.url,
            alt: img.alt,
            sortOrder: i,
            isCover: i === 0,
          })),
        });
      });
      filled += 1;
    } catch (e) {
      log.warn("shopify_image_backfill_row_failed", { slug: product.slug, ...errorMeta(e) });
    }
  }

  return { skipped: false, scanned: products.length, filled };
}
