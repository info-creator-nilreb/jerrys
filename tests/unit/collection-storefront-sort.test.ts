import { describe, expect, it } from "vitest";
import { filterAndSortCollectionProducts } from "@/lib/catalog/collection-storefront-sort";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

function card(partial: Partial<StorefrontProductCard> & Pick<StorefrontProductCard, "id" | "title">): StorefrontProductCard {
  return {
    slug: partial.slug ?? partial.id,
    subtitle: null,
    isBestseller: false,
    priceGrossCents: partial.priceGrossCents ?? 1000,
    listPriceGrossCents: null,
    currency: "EUR",
    availableQuantity: partial.availableQuantity ?? 5,
    minOrderQty: 1,
    purchaseStep: 1,
    maxOrderQty: null,
    amazonRatingAverage: null,
    amazonRatingCount: null,
    amazonReviewUrl: null,
    images: [],
    variants: partial.variants ?? [
      {
        id: "v1",
        sku: "SKU-1",
        title: null,
        isDefault: true,
        priceGrossCents: partial.priceGrossCents ?? 1000,
        availableQuantity: partial.availableQuantity ?? 5,
        minOrderQty: 1,
        purchaseStep: 1,
        maxOrderQty: null,
        deliveryTimeKey: null,
      },
    ],
    ...partial,
  };
}

describe("filterAndSortCollectionProducts", () => {
  it("filters unavailable products", () => {
    const products = [
      card({ id: "a", title: "A", availableQuantity: 0 }),
      card({ id: "b", title: "B", availableQuantity: 2 }),
    ];
    const out = filterAndSortCollectionProducts(products, { sort: "default", onlyAvailable: true });
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });

  it("sorts by price ascending", () => {
    const products = [
      card({ id: "a", title: "A", priceGrossCents: 3000 }),
      card({ id: "b", title: "B", priceGrossCents: 1000 }),
    ];
    const out = filterAndSortCollectionProducts(products, { sort: "price-asc", onlyAvailable: false });
    expect(out.map((p) => p.id)).toEqual(["b", "a"]);
  });
});
