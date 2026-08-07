import { describe, expect, it } from "vitest";
import { filterAndSortCollectionProducts } from "@/lib/catalog/collection-storefront-sort";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

function card(
  partial: Partial<StorefrontProductCard> & Pick<StorefrontProductCard, "id" | "title">,
  variantOverrides?: Partial<StorefrontProductCard["variants"][0]>,
): StorefrontProductCard {
  const variant = {
    id: "v1",
    sku: "SKU-1",
    title: null,
    isDefault: true,
    priceGrossCents: 1000,
    listPriceGrossCents: null,
    availableQuantity: 5,
    minOrderQty: 1,
    purchaseStep: 1,
    maxOrderQty: null,
    deliveryTimeKey: null,
    ...variantOverrides,
  };
  return {
    slug: partial.slug ?? partial.id,
    subtitle: null,
    isBestseller: false,
    currency: "EUR",
    amazonRatingAverage: null,
    amazonRatingCount: null,
    amazonReviewUrl: null,
    images: [],
    variants: [variant],
    ...partial,
  };
}

describe("filterAndSortCollectionProducts", () => {
  it("filters unavailable products", () => {
    const products = [
      card({ id: "a", title: "A" }, { availableQuantity: 0 }),
      card({ id: "b", title: "B" }, { availableQuantity: 2 }),
    ];
    const out = filterAndSortCollectionProducts(products, { sort: "default", onlyAvailable: true });
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });

  it("sorts by price ascending", () => {
    const products = [
      card({ id: "a", title: "A" }, { priceGrossCents: 3000 }),
      card({ id: "b", title: "B" }, { priceGrossCents: 1000 }),
    ];
    const out = filterAndSortCollectionProducts(products, { sort: "price-asc", onlyAvailable: false });
    expect(out.map((p) => p.id)).toEqual(["b", "a"]);
  });
});
