import { getPrisma } from "@/lib/db/prisma";
import { categoryHasActiveProductMembership } from "@/lib/catalog/category-storefront-visibility";
import { storefrontProductCardSelect } from "@/lib/catalog/queries";

export async function listCategoriesForAdmin() {
  return getPrisma().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { id: true, title: true } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export async function getCategoryByIdForAdmin(id: string) {
  return getPrisma().category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, title: true, slug: true } },
      products: {
        orderBy: [{ isPrimary: "desc" }, { product: { title: "asc" } }],
        select: { productId: true, isPrimary: true },
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

export async function listProductsForCategoryPicker() {
  return getPrisma().product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, isActive: true },
  });
}

export async function listCategoriesForProductPicker() {
  return getPrisma().category.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      isActive: true,
      parent: { select: { title: true } },
    },
  });
}

const activeProductOnCategory = categoryHasActiveProductMembership;

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

/** Aktive Kategorien mit mindestens einem sichtbaren Produkt (Storefront-Index). */
export async function listActiveCategoriesForStorefrontIndex() {
  return getPrisma().category.findMany({
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
      parentId: true,
      parent: { select: { title: true, slug: true } },
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
