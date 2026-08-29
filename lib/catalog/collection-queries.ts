import { unstable_cache } from "next/cache";
import { attachShopifyFallbackImages } from "@/lib/catalog/attach-shopify-fallback-images";
import { attachStorefrontBestsellerFlags } from "@/lib/catalog/bestseller-rank";
import { getPrisma } from "@/lib/db/prisma";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";
import {
  storefrontCategoryViaCollectionsSelect,
  storefrontProductCardSelect,
} from "@/lib/catalog/queries";

export async function listCollectionsForAdmin() {
  return getPrisma().collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { products: true } },
    },
  });
}

export async function getCollectionByIdForAdmin(id: string) {
  return getPrisma().collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        select: { productId: true, sortOrder: true },
      },
    },
  });
}

export async function listProductsForCollectionPicker() {
  return getPrisma().product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, isActive: true },
  });
}

async function loadActiveCollectionsForStorefront() {
  return getPrisma().collection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      _count: { select: { products: true } },
    },
  });
}

const getCachedActiveCollectionsForStorefront = unstable_cache(
  loadActiveCollectionsForStorefront,
  ["storefront-active-collections"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
);

export async function listActiveCollectionsForStorefront() {
  return getCachedActiveCollectionsForStorefront();
}

export async function getActiveCollectionBySlugForStorefront(slug: string) {
  const collection = await getPrisma().collection.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      products: {
        orderBy: { sortOrder: "asc" },
        where: { product: { isActive: true } },
        select: {
          product: {
            select: {
              ...storefrontProductCardSelect,
              ...storefrontCategoryViaCollectionsSelect,
            },
          },
        },
      },
    },
  });
  if (!collection) return null;

  const rawProducts = collection.products.map((row) => row.product);
  const withImages = await attachShopifyFallbackImages(rawProducts);
  const flagged = await attachStorefrontBestsellerFlags(withImages);
  const byId = new Map(flagged.map((p) => [p.id, p]));

  return {
    ...collection,
    products: collection.products.flatMap((row) => {
      const product = byId.get(row.product.id);
      return product ? [{ ...row, product }] : [];
    }),
  };
}

/** Aktive Produkte einer Kollektion in Sortierreihenfolge (CMS-Produktblöcke). */
export async function listActiveProductsByCollectionSlugForStorefront(
  collectionSlug: string,
  limit = 12,
) {
  const collection = await getActiveCollectionBySlugForStorefront(collectionSlug);
  if (!collection) return [];
  const take = Math.max(1, limit);
  const products = collection.products.slice(0, take).map((row) => row.product);
  const withImages = await attachShopifyFallbackImages(products);
  return attachStorefrontBestsellerFlags(withImages);
}
