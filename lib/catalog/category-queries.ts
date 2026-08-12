import { getPrisma } from "@/lib/db/prisma";
import { categoryHasActiveProductViaCollections } from "@/lib/catalog/category-storefront-visibility";
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
  isActive: true,
  products: { some: { product: { isActive: true } } },
} as const;

/** Aktive Root-Kategorien für Navigation. */
export async function listActiveCategoriesForNav() {
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

/** Aktive Kategorien mit mindestens einem sichtbaren Produkt (Storefront-Index). */
export async function listActiveCategoriesForStorefrontIndex() {
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

/** Produkte einer aktiven Kategorie (über verknüpfte Kollektionen), per Slug. */
export async function listActiveProductsByCategorySlug(slug: string) {
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
    for (const row of link.collection.products) {
      if (seen.has(row.product.id)) continue;
      seen.add(row.product.id);
      products.push(row.product);
    }
  }

  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    description: category.description,
    parent: category.parent,
    products,
  };
}
