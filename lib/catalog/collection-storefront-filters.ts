import type { StorefrontProductCard } from "@/components/storefront/product-card";
import { pickPrimaryCategoryRef } from "@/lib/catalog/category-membership";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";

export type StorefrontCatalogProduct = StorefrontProductCard & {
  primaryCategory: { slug: string; title: string } | null;
};

export function asCatalogProduct(product: StorefrontProductCard): StorefrontCatalogProduct {
  return { ...product, primaryCategory: null };
}

type CategoryViaCollectionMembership = {
  collection: {
    categoryLinks: Array<{
      category: {
        slug: string;
        title: string;
        sortOrder?: number;
        parentId?: string | null;
      };
    }>;
  };
};

export function mapProductWithPrimaryCategory(
  product: StorefrontProductCard & {
    collectionMemberships?: CategoryViaCollectionMembership[];
    /** @deprecated legacy shape — ignore if collectionMemberships present */
    categoryMemberships?: Array<{ category: { slug: string; title: string } }>;
  },
): StorefrontCatalogProduct {
  const {
    collectionMemberships,
    categoryMemberships: _legacy,
    ...rest
  } = product;

  const fromCollections =
    collectionMemberships?.flatMap((m) =>
      m.collection.categoryLinks.map((l) => l.category),
    ) ?? [];

  const primary =
    fromCollections.length > 0
      ? pickPrimaryCategoryRef(fromCollections)
      : (_legacy?.[0]?.category ?? null);

  return {
    ...rest,
    primaryCategory: primary
      ? { slug: primary.slug, title: primary.title }
      : null,
  };
}

function displayPriceCents(product: StorefrontProductCard): number {
  const v = pickDefaultVariant(product);
  return v?.priceGrossCents ?? 0;
}

/** Ganze Euro aus URL (`preis_min` / `preis_max`). */
export function parsePriceEuroFilter(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function parseCategorySlugFilter(value: string | undefined): string | null {
  const slug = value?.trim();
  return slug ? slug : null;
}

export type CatalogListingFilters = {
  onlyAvailable: boolean;
  priceMinEuros: number | null;
  priceMaxEuros: number | null;
  categorySlug: string | null;
};

export function parseCatalogListingFilters(sp: {
  verfuegbar?: string;
  preis_min?: string;
  preis_max?: string;
  kategorie?: string;
}): CatalogListingFilters {
  return {
    onlyAvailable: sp.verfuegbar === "1",
    priceMinEuros: parsePriceEuroFilter(sp.preis_min),
    priceMaxEuros: parsePriceEuroFilter(sp.preis_max),
    categorySlug: parseCategorySlugFilter(sp.kategorie),
  };
}

export function catalogListingFiltersActive(
  filters: CatalogListingFilters,
  sort: "default" | "title-asc" | "price-asc" | "price-desc",
): boolean {
  return (
    filters.onlyAvailable ||
    sort !== "default" ||
    filters.categorySlug != null ||
    filters.priceMinEuros != null ||
    filters.priceMaxEuros != null
  );
}

export function countActiveCatalogFilters(filters: CatalogListingFilters): number {
  let n = 0;
  if (filters.onlyAvailable) n += 1;
  if (filters.categorySlug) n += 1;
  if (filters.priceMinEuros != null || filters.priceMaxEuros != null) n += 1;
  return n;
}

export function filterProductsByPriceEuroRange(
  products: StorefrontProductCard[],
  minEuros: number | null,
  maxEuros: number | null,
): StorefrontProductCard[] {
  const minCents = minEuros != null ? minEuros * 100 : null;
  const maxCents = maxEuros != null ? maxEuros * 100 : null;
  if (minCents == null && maxCents == null) return products;
  return products.filter((p) => {
    const cents = displayPriceCents(p);
    if (minCents != null && cents < minCents) return false;
    if (maxCents != null && cents > maxCents) return false;
    return true;
  });
}

export function filterProductsByPrimaryCategorySlug(
  products: StorefrontCatalogProduct[],
  slug: string | null,
): StorefrontCatalogProduct[] {
  if (!slug) return products;
  return products.filter((p) => p.primaryCategory?.slug === slug);
}

export function catalogPriceBoundsEuros(products: StorefrontProductCard[]): {
  min: number;
  max: number;
} | null {
  if (products.length === 0) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const p of products) {
    const cents = displayPriceCents(p);
    if (cents <= 0) continue;
    min = Math.min(min, cents);
    max = Math.max(max, cents);
  }
  if (!Number.isFinite(min) || max <= 0) return null;
  return { min: Math.floor(min / 100), max: Math.ceil(max / 100) };
}
