/**
 * Storefront-Regeln für Kategorien (Epic 10) — rein testbar, ohne Prisma.
 * Abgleich mit `listActiveCategoriesForNav` und Kategorie-Listing-Seiten.
 */

/** Mindestens ein aktives Shop-Produkt in der Zuordnung (Spiegel der Prisma-Filter). */
export const categoryHasActiveProductMembership = {
  product: { isActive: true },
} as const;

export type CategoryNavCandidate = {
  isActive: boolean;
  parentId: string | null;
  /** Mindestens ein aktives Produkt (direkt oder aggregiert). */
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
