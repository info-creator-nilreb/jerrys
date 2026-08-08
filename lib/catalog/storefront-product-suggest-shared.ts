/** Client-sichere Konstanten/Typen für Storefront-Typeahead (kein Prisma). */

export const STOREFRONT_SUGGEST_LIMIT = 6;
export const STOREFRONT_SUGGEST_DEBOUNCE_MS = 250;

export type StorefrontProductSuggestion = {
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  priceGrossCents: number | null;
  currency: string;
};

export type StorefrontProductSuggestResponse = {
  suggestions: StorefrontProductSuggestion[];
};
