import { describe, expect, it } from "vitest";
import type { StorefrontProductCard } from "@/components/storefront/product-card";
import {
  filterProductBlockProducts,
  isStorefrontProductOrderable,
  productBlockFetchLimit,
} from "@/lib/content/blocks/product-block-filter";

function product(overrides: Partial<StorefrontProductCard> = {}): StorefrontProductCard {
  return {
    id: "p1",
    slug: "produkt",
    title: "Produkt",
    subtitle: null,
    isBestseller: false,
    currency: "EUR",
    amazonRatingAverage: null,
    amazonRatingCount: null,
    amazonReviewUrl: null,
    images: [],
    variants: [
      {
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
      },
    ],
    ...overrides,
  };
}

describe("isStorefrontProductOrderable", () => {
  it("ist false ohne Variante", () => {
    expect(isStorefrontProductOrderable(product({ variants: [] }))).toBe(false);
  });

  it("ist false bei fehlendem Lager für Mindestmenge", () => {
    expect(
      isStorefrontProductOrderable(
        product({
          variants: [
            {
              id: "v1",
              sku: "SKU-1",
              title: null,
              isDefault: true,
              priceGrossCents: 1000,
              listPriceGrossCents: null,
              availableQuantity: 0,
              minOrderQty: 1,
              purchaseStep: 1,
              maxOrderQty: null,
              deliveryTimeKey: null,
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("ist true bei verfügbarer Variante", () => {
    expect(isStorefrontProductOrderable(product())).toBe(true);
  });
});

describe("filterProductBlockProducts", () => {
  const list = [
    product({ id: "a", slug: "a" }),
    product({
      id: "b",
      slug: "b",
      variants: [
        {
          id: "v2",
          sku: "SKU-2",
          title: null,
          isDefault: true,
          priceGrossCents: 1000,
          listPriceGrossCents: null,
          availableQuantity: 0,
          minOrderQty: 1,
          purchaseStep: 1,
          maxOrderQty: null,
          deliveryTimeKey: null,
        },
      ],
    }),
    product({ id: "c", slug: "c" }),
  ];

  it("behält alle Produkte bei showNotOrderable true", () => {
    expect(filterProductBlockProducts(list, { showNotOrderable: true, limit: 2 })).toHaveLength(
      2,
    );
  });

  it("filtert nicht bestellbare bei showNotOrderable false", () => {
    const filtered = filterProductBlockProducts(list, { showNotOrderable: false });
    expect(filtered.map((p) => p.id)).toEqual(["a", "c"]);
  });
});

describe("productBlockFetchLimit", () => {
  it("nutzt limit unverändert wenn nicht bestellbare sichtbar sind", () => {
    expect(productBlockFetchLimit(12, true)).toBe(12);
  });

  it("überfetcht bei Filter auf bestellbare Produkte", () => {
    expect(productBlockFetchLimit(12, false)).toBe(48);
    expect(productBlockFetchLimit(8, false)).toBe(32);
  });
});
