import type { StorefrontProductCard } from "@/components/storefront/product-card";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";

export type CollectionSort = "default" | "title-asc" | "price-asc" | "price-desc";

export function parseCollectionSort(value: string | undefined): CollectionSort {
  if (value === "title-asc" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

function displayPriceCents(product: StorefrontProductCard): number {
  const v = pickDefaultVariant(product);
  return v?.priceGrossCents ?? 0;
}

function isProductAvailable(product: StorefrontProductCard): boolean {
  const v = pickDefaultVariant(product);
  return (v?.availableQuantity ?? 0) > 0;
}

export function filterAndSortCollectionProducts(
  products: StorefrontProductCard[],
  options: { sort: CollectionSort; onlyAvailable: boolean },
): StorefrontProductCard[] {
  let list = [...products];
  if (options.onlyAvailable) {
    list = list.filter(isProductAvailable);
  }
  switch (options.sort) {
    case "title-asc":
      list.sort((a, b) => a.title.localeCompare(b.title, "de"));
      break;
    case "price-asc":
      list.sort((a, b) => displayPriceCents(a) - displayPriceCents(b));
      break;
    case "price-desc":
      list.sort((a, b) => displayPriceCents(b) - displayPriceCents(a));
      break;
    default:
      break;
  }
  return list;
}
