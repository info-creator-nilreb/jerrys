import { unstable_cache } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { attachShopifyFallbackImages } from "@/lib/catalog/attach-shopify-fallback-images";
import { attachStorefrontBestsellerFlags } from "@/lib/catalog/bestseller-rank";
import { listActiveProductsForLinkedCollection } from "@/lib/catalog/collection-queries";
import { getPrisma } from "@/lib/db/prisma";
import { categoryHasActiveProductViaCollections } from "@/lib/catalog/category-storefront-visibility";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";
import { storefrontProductCardSelect } from "@/lib/catalog/queries";

const activeViaCollections = categoryHasActiveProductViaCollections;

export async function listCategoriesForAdmin() {
  const rows = await getPrisma().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { id: true, title: true } },
      collections: {
        select: {
          collection: {
            select: {
              _count: {
                select: {
                  products: { where: { product: { isActive: true } } },
                },
              },
            },
          },
        },
      },
      _count: { select: { collections: true, children: true } },
    },
  });

  return rows.map((c) => {
    const productIdEstimate = c.collections.reduce(
      (sum, link) => sum + link.collection._count.products,
      0,
    );
    const { collections, ...rest } = c;
    void collections;
    return {
      ...rest,
      /** Summe aktiver Produkte über verknüpfte Kollektionen (ohne Dedup; Anzeige). */
      linkedProductCount: productIdEstimate,
    };
  });
}

export async function getCategoryByIdForAdmin(id: string) {
  return getPrisma().category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, title: true, slug: true } },
      collections: {
        orderBy: [{ sortOrder: "asc" }, { collection: { title: "asc" } }],
        select: {
          collectionId: true,
          sortOrder: true,
          collection: {
            select: { id: true, title: true, slug: true, isActive: true },
          },
        },
      },
      _count: { select: { children: true } },
    },
  });
}

/** Nur Root-Kategorien für Parent-Auswahl (max. eine Verschachtelungsebene). */
export async function listRootCategoriesForParentPicker(excludeCategoryId?: string) {
  return getPrisma().category.findMany({
    where: {
      parentId: null,
      ...(excludeCategoryId ? { id: { not: excludeCategoryId } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true },
  });
}

export async function listCollectionsForCategoryPicker() {
  return getPrisma().collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, isActive: true },
  });
}

const activeProductInLinkedCollection = {
  OR: [
    {
      isActive: true,
      membershipMode: "manual",
      products: { some: { product: { isActive: true } } },
    },
    {
      isActive: true,
      membershipMode: "created_within_days",
      ruleDays: { gt: 0 },
    },
  ],
} satisfies Prisma.CollectionWhereInput;

/** Aktive Root-Kategorien für Navigation. */
async function loadActiveCategoriesForNav() {
  return getPrisma().category.findMany({
    where: {
      isActive: true,
      parentId: null,
      ...activeViaCollections,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      _count: {
        select: {
          collections: {
            where: { collection: activeProductInLinkedCollection },
          },
        },
      },
    },
  });
}

const getCachedActiveCategoriesForNav = unstable_cache(
  loadActiveCategoriesForNav,
  ["storefront-active-categories-nav"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
);

export async function listActiveCategoriesForNav() {
  return getCachedActiveCategoriesForNav();
}

/** Aktive Kategorie inkl. Unterkategorien (eine Ebene) für Nav-Erweiterung. */
export async function listActiveCategoryTreeForNav() {
  return getPrisma().category.findMany({
    where: {
      isActive: true,
      parentId: null,
      OR: [
        activeViaCollections,
        {
          children: {
            some: {
              isActive: true,
              ...activeViaCollections,
            },
          },
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      children: {
        where: {
          isActive: true,
          ...activeViaCollections,
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: {
            select: {
              collections: {
                where: { collection: activeProductInLinkedCollection },
              },
            },
          },
        },
      },
      _count: {
        select: {
          collections: {
            where: { collection: activeProductInLinkedCollection },
          },
        },
      },
    },
  });
}

async function loadActiveCategoriesForStorefrontIndex() {
  const rows = await getPrisma().category.findMany({
    where: {
      isActive: true,
      ...activeViaCollections,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      parentId: true,
      parent: { select: { title: true, slug: true } },
      collections: {
        where: { collection: { isActive: true } },
        select: {
          collection: {
            select: {
              products: {
                where: { product: { isActive: true } },
                select: { productId: true },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((c) => {
    const ids = new Set<string>();
    for (const link of c.collections) {
      for (const p of link.collection.products) ids.add(p.productId);
    }
    const { collections, ...rest } = c;
    void collections;
    return {
      ...rest,
      productCount: ids.size,
    };
  });
}

const getCachedActiveCategoriesForStorefrontIndex = unstable_cache(
  loadActiveCategoriesForStorefrontIndex,
  ["storefront-active-categories-index"],
  { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
);

/** Aktive Kategorien mit mindestens einem sichtbaren Produkt (Storefront-Index). */
export async function listActiveCategoriesForStorefrontIndex() {
  return getCachedActiveCategoriesForStorefrontIndex();
}

async function loadActiveProductsByCategorySlug(slug: string) {
  const category = await getPrisma().category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      parent: {
        select: { slug: true, title: true },
      },
      collections: {
        where: { collection: { isActive: true } },
        orderBy: [{ sortOrder: "asc" }, { collection: { sortOrder: "asc" } }],
        select: {
          collection: {
            select: {
              id: true,
              membershipMode: true,
              ruleDays: true,
              products: {
                where: { product: { isActive: true } },
                orderBy: [{ sortOrder: "asc" }, { product: { title: "asc" } }],
                select: {
                  sortOrder: true,
                  product: { select: storefrontProductCardSelect },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!category) return null;

  const seen = new Set<string>();
  const products: Array<(typeof category.collections)[number]["collection"]["products"][number]["product"]> =
    [];
  for (const link of category.collections) {
    const collectionProducts = await listActiveProductsForLinkedCollection(link.collection);
    for (const product of collectionProducts) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
    }
  }

  const withImages = await attachShopifyFallbackImages(products);
  const flagged = await attachStorefrontBestsellerFlags(withImages);
  const byId = new Map(flagged.map((p) => [p.id, p]));

  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    description: category.description,
    parent: category.parent,
    products: products.flatMap((p) => {
      const hit = byId.get(p.id);
      return hit ? [hit] : [];
    }),
  };
}

function getCachedActiveProductsByCategorySlug(slug: string) {
  return unstable_cache(
    () => loadActiveProductsByCategorySlug(slug),
    ["storefront-category-products", slug],
    { tags: [STOREFRONT_CATALOG_CACHE_TAG], revalidate: 60 },
  )();
}

/** Produkte einer aktiven Kategorie (über verknüpfte Kollektionen), per Slug. */
export async function listActiveProductsByCategorySlug(slug: string) {
  return getCachedActiveProductsByCategorySlug(slug);
}
