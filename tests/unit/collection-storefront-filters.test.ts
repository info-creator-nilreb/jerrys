import { describe, expect, it } from "vitest";
import type { StorefrontProductCard } from "@/components/storefront/product-card";
import {
  catalogListingFiltersActive,
  catalogPriceBoundsEuros,
  filterProductsByPriceEuroRange,
  filterProductsByPrimaryCategorySlug,
  mapProductWithPrimaryCategory,
  parseCatalogListingFilters,
  parsePriceEuroFilter,
} from "@/lib/catalog/collection-storefront-filters";

function card(
  partial: Partial<StorefrontProductCard> & Pick<StorefrontProductCard, "id" | "title">,
  variantOverrides?: Partial<StorefrontProductCard["variants"][0]>,
): StorefrontProductCard {
  const variant = {
    id: "v1",
    sku: "SKU-1",
    title: null,
    isDefault: true,
    priceGrossCents: 2500,
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

describe("parsePriceEuroFilter", () => {
  it("parses non-negative integers", () => {
    expect(parsePriceEuroFilter("10")).toBe(10);
    expect(parsePriceEuroFilter("0")).toBe(0);
  });

  it("rejects invalid values", () => {
    expect(parsePriceEuroFilter(undefined)).toBeNull();
    expect(parsePriceEuroFilter("")).toBeNull();
    expect(parsePriceEuroFilter("-1")).toBeNull();
    expect(parsePriceEuroFilter("12.5")).toBe(12);
  });
});

describe("parseCatalogListingFilters", () => {
  it("maps URL params to filter state", () => {
    expect(
      parseCatalogListingFilters({
        verfuegbar: "1",
        preis_min: "5",
        preis_max: "99",
        kategorie: "katzenmoebel",
      }),
    ).toEqual({
      onlyAvailable: true,
      priceMinEuros: 5,
      priceMaxEuros: 99,
      categorySlug: "katzenmoebel",
    });
  });
});

describe("catalogListingFiltersActive", () => {
  it("is false when nothing is set", () => {
    expect(
      catalogListingFiltersActive(
        {
          onlyAvailable: false,
          priceMinEuros: null,
          priceMaxEuros: null,
          categorySlug: null,
        },
        "default",
      ),
    ).toBe(false);
  });

  it("is true when price or sort is set", () => {
    expect(
      catalogListingFiltersActive(
        {
          onlyAvailable: false,
          priceMinEuros: 10,
          priceMaxEuros: null,
          categorySlug: null,
        },
        "default",
      ),
    ).toBe(true);
    expect(
      catalogListingFiltersActive(
        {
          onlyAvailable: false,
          priceMinEuros: null,
          priceMaxEuros: null,
          categorySlug: null,
        },
        "price-asc",
      ),
    ).toBe(true);
  });
});

describe("filterProductsByPriceEuroRange", () => {
  it("filters by min and max euros", () => {
    const products = [
      card({ id: "a", title: "A" }, { priceGrossCents: 500 }),
      card({ id: "b", title: "B" }, { priceGrossCents: 1500 }),
      card({ id: "c", title: "C" }, { priceGrossCents: 2500 }),
    ];
    const out = filterProductsByPriceEuroRange(products, 10, 20);
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("filterProductsByPrimaryCategorySlug", () => {
  it("filters by primary category slug derived from collections", () => {
    const products = [
      mapProductWithPrimaryCategory({
        ...card({ id: "a", title: "A" }),
        collectionMemberships: [
          {
            collection: {
              categoryLinks: [{ category: { slug: "x", title: "X", sortOrder: 0, parentId: null } }],
            },
          },
        ],
      }),
      mapProductWithPrimaryCategory({
        ...card({ id: "b", title: "B" }),
        collectionMemberships: [
          {
            collection: {
              categoryLinks: [{ category: { slug: "y", title: "Y", sortOrder: 0, parentId: null } }],
            },
          },
        ],
      }),
    ];
    const out = filterProductsByPrimaryCategorySlug(products, "y");
    expect(out.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("catalogPriceBoundsEuros", () => {
  it("returns floor/ceil euro bounds", () => {
    const products = [
      card({ id: "a", title: "A" }, { priceGrossCents: 1099 }),
      card({ id: "b", title: "B" }, { priceGrossCents: 5010 }),
    ];
    expect(catalogPriceBoundsEuros(products)).toEqual({ min: 10, max: 51 });
  });
});
