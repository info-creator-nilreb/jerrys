import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";

/** Rollierendes Fenster — üblich bei Shopify/WooCommerce-Best-Seller-Collections. */
export const BESTSELLER_WINDOW_DAYS = 90;
/** Mindestverkäufe, damit das Badge nicht bei Einzelstücken flackert. */
export const BESTSELLER_MIN_UNITS = 3;
/** Anteil aktiver Produkte mit Badge (Cap über BESTSELLER_MAX_COUNT). */
export const BESTSELLER_TOP_PERCENT = 0.15;
export const BESTSELLER_MAX_COUNT = 12;

/** Keine Umsätze aus Entwürfen, Stornos oder Voll-Erstattungen. */
const EXCLUDED_ORDER_STATUSES = ["cancelled", "refunded", "draft", "pending_payment"] as const;

export type ProductSalesRank = {
  productId: string;
  unitsSold: number;
};

/**
 * Ermittelt Bestseller anhand verkaufter Stückzahl (Shopify „Best selling“ / WooCommerce-Logik):
 * rollierendes Fenster, Mindestmenge, dann Top-Anteil der aktiven Produkte.
 */
export function pickBestsellerProductIds(
  ranks: ProductSalesRank[],
  activeProductCount: number,
): Set<string> {
  if (activeProductCount <= 0 || ranks.length === 0) return new Set();

  const eligible = ranks
    .filter((r) => r.unitsSold >= BESTSELLER_MIN_UNITS)
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const slotCount = Math.max(
    1,
    Math.min(
      BESTSELLER_MAX_COUNT,
      Math.ceil(activeProductCount * BESTSELLER_TOP_PERCENT),
    ),
  );

  return new Set(eligible.slice(0, slotCount).map((r) => r.productId));
}

async function loadProductSalesRanks(): Promise<ProductSalesRank[]> {
  const since = new Date();
  since.setDate(since.getDate() - BESTSELLER_WINDOW_DAYS);

  const rows = await getPrisma().orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        status: { notIn: [...EXCLUDED_ORDER_STATUSES] },
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
  });

  return rows
    .map((r) => ({
      productId: r.productId,
      unitsSold: r._sum.quantity ?? 0,
    }))
    .filter((r) => r.unitsSold > 0);
}

const getCachedBestsellerProductIds = unstable_cache(
  async () => {
    const [ranks, activeProductCount] = await Promise.all([
      loadProductSalesRanks(),
      getPrisma().product.count({ where: { isActive: true } }),
    ]);
    return [...pickBestsellerProductIds(ranks, activeProductCount)];
  },
  ["storefront-bestseller-product-ids"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 3600 },
);

export async function getBestsellerProductIdSet(): Promise<Set<string>> {
  const ids = await getCachedBestsellerProductIds();
  return new Set(ids);
}

export async function isProductBestseller(productId: string): Promise<boolean> {
  const ids = await getBestsellerProductIdSet();
  return ids.has(productId);
}

export function withBestsellerFlags<T extends { id: string }>(
  products: T[],
  bestsellerIds: Set<string>,
): (T & { isBestseller: boolean })[] {
  return products.map((p) => ({
    ...p,
    isBestseller: bestsellerIds.has(p.id),
  }));
}

/** Storefront-Hilfe: Bestseller-Flag an Produktlisten anhängen. */
export async function attachStorefrontBestsellerFlags<T extends { id: string }>(
  products: T[],
): Promise<(T & { isBestseller: boolean })[]> {
  const bestsellerIds = await getBestsellerProductIdSet();
  return withBestsellerFlags(products, bestsellerIds);
}
