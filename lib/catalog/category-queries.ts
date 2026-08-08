import { getPrisma } from "@/lib/db/prisma";
import { storefrontProductCardSelect } from "@/lib/catalog/queries";

const activeProductOnCategory = {
  product: { isActive: true },
} as const;

/** Aktive Root-Kategorien für Navigation (Slice 4); Slice 1 — Daten-API. */
export async function listActiveCategoriesForNav() {
  return getPrisma().category.findMany({
    where: {
      isActive: true,
      parentId: null,
      products: {
        some: activeProductOnCategory,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      _count: {
        select: {
          products: {
            where: activeProductOnCategory,
          },
        },
      },
    },
  });
}

/** Aktive Kategorie inkl. Unterkategorien (eine Ebene) für spätere Nav-Erweiterung. */
export async function listActiveCategoryTreeForNav() {
  return getPrisma().category.findMany({
    where: {
      isActive: true,
      parentId: null,
      OR: [
        { products: { some: activeProductOnCategory } },
        {
          children: {
            some: {
              isActive: true,
              products: { some: activeProductOnCategory },
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
          products: { some: activeProductOnCategory },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          _count: {
            select: {
              products: { where: activeProductOnCategory },
            },
          },
        },
      },
      _count: {
        select: {
          products: { where: activeProductOnCategory },
        },
      },
    },
  });
}

/** Produkte einer aktiven Kategorie (Storefront-Karten), per Slug. */
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
      products: {
        where: activeProductOnCategory,
        orderBy: [{ product: { sortOrder: "asc" } }, { product: { title: "asc" } }],
        select: {
          isPrimary: true,
          product: {
            select: storefrontProductCardSelect,
          },
        },
      },
    },
  });

  if (!category) return null;

  return {
    ...category,
    products: category.products.map((row) => row.product),
  };
}
