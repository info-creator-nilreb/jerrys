/**
 * Storefront-Regeln für Kategorien — rein testbar, ohne Prisma.
 * Produkte einer Kategorie kommen nur über verknüpfte aktive Kollektionen.
 */

/** Mindestens ein aktives Shop-Produkt in einer aktiven verknüpften Kollektion. */
export const categoryHasActiveProductViaCollections = {
  collections: {
    some: {
      collection: {
        isActive: true,
        products: { some: { product: { isActive: true } } },
      },
    },
  },
} as const;

/** @deprecated Alias — gleiche Semantik wie `categoryHasActiveProductViaCollections`. */
export const categoryHasActiveProductMembership = categoryHasActiveProductViaCollections;

export type CategoryNavCandidate = {
  isActive: boolean;
  parentId: string | null;
  /** Mindestens ein aktives Produkt (über Kollektionen). */
  hasActiveProduct: boolean;
};

/** Root-Kategorie mit aktivem Produkt → Header-Primary-Nav (max. Anzahl separat). */
export function isCategoryEligibleForPrimaryNav(candidate: CategoryNavCandidate): boolean {
  return candidate.isActive && candidate.parentId == null && candidate.hasActiveProduct;
}

/** Kategorie-Listing `/kategorien/[slug]`: 404 wenn unbekannt, inaktiv (via Query) oder leer. */
export function categoryListingShouldNotFound(
  category: { products: readonly unknown[] } | null,
): boolean {
  return category == null || category.products.length === 0;
}

export function isPublishedCategoryListing<T extends { products: readonly unknown[] }>(
  category: T | null,
): category is T {
  return category != null && category.products.length > 0;
}
