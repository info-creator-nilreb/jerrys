import type { StorefrontProductCard } from "@/components/storefront/product-card";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";

export type CollectionSort = "default" | "created-desc" | "title-asc" | "price-asc" | "price-desc";

/** Nur explizite Sortierungen — Default = Katalogreihenfolge ohne URL-Parameter. */
export const COLLECTION_SORT_OPTIONS: { value: Exclude<CollectionSort, "default">; label: string }[] =
  [
    { value: "created-desc", label: "Neueste zuerst" },
    { value: "title-asc", label: "Name A–Z" },
    { value: "price-asc", label: "Preis aufsteigend" },
    { value: "price-desc", label: "Preis absteigend" },
  ];

export function collectionSortLabel(sort: CollectionSort): string | null {
  if (sort === "default") return null;
  return COLLECTION_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? null;
}

export function parseCollectionSort(value: string | undefined): CollectionSort {
  if (
    value === "created-desc" ||
    value === "title-asc" ||
    value === "price-asc" ||
    value === "price-desc"
  ) {
    return value;
  }
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
    case "created-desc":
      list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return a.title.localeCompare(b.title, "de");
      });
      break;
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
