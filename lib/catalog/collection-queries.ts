import { unstable_cache } from "next/cache";
import { attachShopifyFallbackImages } from "@/lib/catalog/attach-shopify-fallback-images";
import { attachStorefrontBestsellerFlags } from "@/lib/catalog/bestseller-rank";
import {
  cutoffDateForCreatedWithinDays,
  isAutomaticCollectionMembership,
  normalizeCreatedWithinRuleDays,
} from "@/lib/catalog/collection-membership";
import { getPrisma } from "@/lib/db/prisma";
import { runStorefrontCatalogCache } from "@/lib/catalog/run-storefront-catalog-cache";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";
import {
  storefrontCategoryViaCollectionsSelect,
  storefrontProductCardSelect,
} from "@/lib/catalog/queries";

const storefrontProductSelect = {
  ...storefrontProductCardSelect,
  ...storefrontCategoryViaCollectionsSelect,
} as const;

type LinkedCollectionProductRow = {
  sortOrder: number;
  product: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    createdAt: Date;
    currency: string;
    amazonRatingAverage: number | null;
    amazonRatingCount: number | null;
    amazonReviewUrl: string | null;
    images: { url: string; alt: string }[];
    variants: Array<{
      id: string;
      sku: string;
      title: string | null;
      isDefault: boolean;
      priceGrossCents: number;
      listPriceGrossCents: number | null;
      availableQuantity: number;
      minOrderQty: number;
      purchaseStep: number;
      maxOrderQty: number | null;
      deliveryTimeKey: string | null;
    }>;
    collectionMemberships?: unknown;
  };
};

type StorefrontProductRow = {
  product: Awaited<ReturnType<typeof loadAutomaticCollectionProducts>>[number];
  sortOrder: number;
};

async function loadAutomaticCollectionProducts(ruleDays: number) {
  const since = cutoffDateForCreatedWithinDays(normalizeCreatedWithinRuleDays(ruleDays));
  return getPrisma().product.findMany({
    where: { isActive: true, createdAt: { gte: since } },
    orderBy: [{ createdAt: "desc" }, { title: "asc" }],
    select: storefrontProductSelect,
  });
}

export async function countActiveProductsForCollection(collection: {
  id: string;
  membershipMode: string;
  ruleDays: number | null;
}): Promise<number> {
  if (isAutomaticCollectionMembership(collection.membershipMode)) {
    const since = cutoffDateForCreatedWithinDays(
      normalizeCreatedWithinRuleDays(collection.ruleDays ?? undefined),
    );
    return getPrisma().product.count({
      where: { isActive: true, createdAt: { gte: since } },
    });
  }

  return getPrisma().collectionProduct.count({
    where: { collectionId: collection.id, product: { isActive: true } },
  });
}

export async function listCollectionsForAdmin() {
  const rows = await getPrisma().collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      isActive: true,
      membershipMode: true,
      ruleDays: true,
    },
  });

  return Promise.all(
    rows.map(async (collection) => ({
      ...collection,
      productCount: await countActiveProductsForCollection(collection),
    })),
  );
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
  const rows = await getPrisma().collection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      membershipMode: true,
      ruleDays: true,
    },
  });

  return Promise.all(
    rows.map(async (collection) => ({
      ...collection,
      _count: { products: await countActiveProductsForCollection(collection) },
    })),
  );
}

const getCachedActiveCollectionsForStorefront = unstable_cache(
  loadActiveCollectionsForStorefront,
  ["storefront-active-collections"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
);

export async function listActiveCollectionsForStorefront() {
  return getCachedActiveCollectionsForStorefront();
}

async function resolveStorefrontCollectionProducts(collection: {
  id: string;
  membershipMode: string;
  ruleDays: number | null;
  products: LinkedCollectionProductRow[];
}): Promise<StorefrontProductRow[]> {
  if (isAutomaticCollectionMembership(collection.membershipMode)) {
    const products = await loadAutomaticCollectionProducts(collection.ruleDays ?? 0);
    return products.map((product, index) => ({ product, sortOrder: index }));
  }

  return collection.products.map((row) => ({
    product: row.product,
    sortOrder: row.sortOrder,
  })) as StorefrontProductRow[];
}

export async function getActiveCollectionBySlugForStorefront(slug: string) {
  return runStorefrontCatalogCache(
    ["storefront-collection-detail", slug],
    () => loadActiveCollectionBySlugForStorefront(slug),
  );
}

async function loadActiveCollectionBySlugForStorefront(slug: string) {
  const collection = await getPrisma().collection.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      membershipMode: true,
      ruleDays: true,
      products: {
        orderBy: { sortOrder: "asc" },
        where: { product: { isActive: true } },
        select: {
          sortOrder: true,
          product: { select: storefrontProductSelect },
        },
      },
    },
  });
  if (!collection) return null;

  const productRows = await resolveStorefrontCollectionProducts(collection);
  const rawProducts = productRows.map((row) => row.product);
  const withImages = await attachShopifyFallbackImages(rawProducts);
  const flagged = await attachStorefrontBestsellerFlags(withImages);
  const byId = new Map(flagged.map((p) => [p.id, p]));

  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    membershipMode: collection.membershipMode,
    ruleDays: collection.ruleDays,
    products: productRows.flatMap((row) => {
      const product = byId.get(row.product.id);
      return product ? [{ sortOrder: row.sortOrder, product }] : [];
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

/** Produkte einer verknüpften Kollektion für Kategorie-Listings (manuell oder automatisch). */
export async function listActiveProductsForLinkedCollection(collection: {
  id: string;
  membershipMode: string;
  ruleDays: number | null;
  products: LinkedCollectionProductRow[];
}) {
  const rows = await resolveStorefrontCollectionProducts(collection);
  return rows.map((row) => row.product);
}
