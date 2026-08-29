import { defaultAddQuantity } from "@/lib/cart/quantity";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
} from "@/lib/catalog/default-variant-storefront";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

export function isStorefrontProductOrderable(product: StorefrontProductCard): boolean {
  const variant = pickDefaultVariant(product);
  if (!variant) return false;
  const rules = quantityRulesFromVariant(variant);
  return defaultAddQuantity(rules) !== null;
}

/** Filtert CMS-Produktlisten; bei `showNotOrderable: false` nur bestellbare behalten. */
export function filterProductBlockProducts<T extends StorefrontProductCard>(
  products: T[],
  options: { showNotOrderable: boolean; limit?: number },
): T[] {
  const filtered = options.showNotOrderable
    ? products
    : products.filter(isStorefrontProductOrderable);
  if (options.limit != null && options.limit > 0) {
    return filtered.slice(0, options.limit);
  }
  return filtered;
}

/** Überfetch-Faktor, wenn nach Bestellbarkeit gefiltert wird (max. Block-Limit). */
export function productBlockFetchLimit(
  limit: number,
  showNotOrderable: boolean,
): number {
  if (showNotOrderable) return Math.max(1, limit);
  return Math.min(48, Math.max(1, limit) * 4);
}
