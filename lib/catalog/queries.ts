import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/db/prisma";
import { prismaDefaultVariantInclude, prismaStorefrontActiveVariantsInclude } from "@/lib/catalog/default-variant-storefront";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";

/** Storefront-Produktkarte: Commerce-Felder nur über `variants`. */
export const storefrontProductCardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  isBestseller: true,
  currency: true,
  amazonRatingAverage: true,
  amazonRatingCount: true,
  amazonReviewUrl: true,
  variants: prismaDefaultVariantInclude,
  images: {
    orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }],
    take: 5,
    select: { url: true, alt: true },
  },
};

/** Kategorien über aktive Kollektionen (für Primary-Ableitung / Facetten). */
export const storefrontCategoryViaCollectionsSelect = {
  collectionMemberships: {
    where: { collection: { isActive: true } },
    select: {
      collection: {
        select: {
          categoryLinks: {
            where: { category: { isActive: true } },
            select: {
              category: {
                select: {
                  slug: true,
                  title: true,
                  sortOrder: true,
                  parentId: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

async function loadActiveProductsForStorefront(take?: number) {
  return getPrisma().product.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    ...(take != null && take > 0 ? { take } : {}),
    select: {
      ...storefrontProductCardSelect,
      ...storefrontCategoryViaCollectionsSelect,
    },
  });
}

const getCachedActiveProductsForStorefront = unstable_cache(
  async () => loadActiveProductsForStorefront(),
  ["storefront-active-products"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
);

export async function listActiveProductsForStorefront(options?: { take?: number }) {
  const take = options?.take;
  /** Immer den getaggten Cache nutzen — `take` nur als Slice (Homepage-Kuratierung). */
  const all = await getCachedActiveProductsForStorefront();
  if (take != null && take > 0) {
    return all.slice(0, take);
  }
  return all;
}

/** Aktive Produkte in ID-Reihenfolge (CMS kuratierte Listen). */
export async function listActiveProductsByIdsForStorefront(
  productIds: string[],
  limit = 12,
) {
  const ids = productIds.slice(0, Math.max(1, limit));
  if (ids.length === 0) return [];
  const rows = await getPrisma().product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: {
      ...storefrontProductCardSelect,
      ...storefrontCategoryViaCollectionsSelect,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => r != null);
}

export async function listActiveProductsByCategorySlugForStorefront(
  categorySlug: string,
  limit = 12,
) {
  return getPrisma().product.findMany({
    where: {
      isActive: true,
      collectionMemberships: {
        some: {
          collection: {
            isActive: true,
            categoryLinks: {
              some: { category: { slug: categorySlug, isActive: true } },
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: limit,
    select: {
      ...storefrontProductCardSelect,
      ...storefrontCategoryViaCollectionsSelect,
    },
  });
}

export async function getActiveProductBySlug(slug: string) {
  return getPrisma().product.findFirst({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      variants: prismaStorefrontActiveVariantsInclude,
      collectionMemberships: {
        where: { collection: { isActive: true } },
        select: {
          collection: {
            select: {
              slug: true,
              title: true,
              categoryLinks: {
                where: { category: { isActive: true } },
                select: {
                  category: {
                    select: {
                      slug: true,
                      title: true,
                      sortOrder: true,
                      parentId: true,
                      parent: { select: { slug: true, title: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

const defaultVariantAdminSelect = {
  id: true,
  sku: true,
  title: true,
  isDefault: true,
  isActive: true,
  taxRatePercent: true,
  priceGrossCents: true,
  priceNetCents: true,
  listPriceGrossCents: true,
  listPriceNetCents: true,
  lowestPrice30dGrossCents: true,
  lowestPrice30dNetCents: true,
  stockQuantity: true,
  availableQuantity: true,
  deliveryTimeKey: true,
  restockDays: true,
  minOrderQty: true,
  purchaseStep: true,
  maxOrderQty: true,
} as const;

export async function listProductsForAdmin() {
  return getPrisma().product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      variants: {
        where: { isDefault: true },
        take: 1,
        select: { priceGrossCents: true },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
  });
}

export async function getProductByIdForAdmin(id: string) {
  return getPrisma().product.findUnique({
    where: { id },
    include: {
      manufacturer: true,
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      variants: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        select: defaultVariantAdminSelect,
      },
      collectionMemberships: {
        orderBy: [{ sortOrder: "asc" }, { collection: { title: "asc" } }],
        select: {
          collectionId: true,
          collection: { select: { id: true, title: true, slug: true, isActive: true } },
        },
      },
    },
  });
}

export async function listManufacturersForAdmin() {
  return getPrisma().manufacturer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
