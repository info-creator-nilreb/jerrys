/** Minimale Query-Länge für Storefront-Suche (Epic 8 Slice 3). */
export const STOREFRONT_SEARCH_MIN_LENGTH = 2;

export type StorefrontSearchableProduct = {
  title: string;
  slug: string;
  subtitle?: string | null;
};

/**
 * Normalisiert `q` aus der URL. Unter min. Länge → keine aktive Suche (`null`).
 */
export function parseStorefrontSearchQuery(value: string | undefined): string | null {
  if (value == null) return null;
  const term = value.trim().slice(0, 100);
  if (term.length < STOREFRONT_SEARCH_MIN_LENGTH) return null;
  return term;
}

function normalizeForMatch(value: string): string {
  return value.trim().toLocaleLowerCase("de");
}

export function productMatchesStorefrontSearch(
  product: StorefrontSearchableProduct,
  query: string,
): boolean {
  const needle = normalizeForMatch(query);
  if (needle.length < STOREFRONT_SEARCH_MIN_LENGTH) return true;
  const haystacks = [product.title, product.slug, product.subtitle ?? ""].map(normalizeForMatch);
  return haystacks.some((h) => h.includes(needle));
}

export function filterProductsByStorefrontSearch<T extends StorefrontSearchableProduct>(
  products: T[],
  query: string | null,
): T[] {
  if (!query) return products;
  return products.filter((p) => productMatchesStorefrontSearch(p, query));
}
