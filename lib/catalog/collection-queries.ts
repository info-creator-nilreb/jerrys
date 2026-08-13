import { unstable_cache } from "next/cache";
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
  return getPrisma().collection.findFirst({
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
}

/** Aktive Produkte einer Kollektion in Sortierreihenfolge (CMS-Produktblöcke). */
export async function listActiveProductsByCollectionSlugForStorefront(
  collectionSlug: string,
  limit = 12,
) {
  const collection = await getActiveCollectionBySlugForStorefront(collectionSlug);
  if (!collection) return [];
  const take = Math.max(1, limit);
  return collection.products.slice(0, take).map((row) => row.product);
}
