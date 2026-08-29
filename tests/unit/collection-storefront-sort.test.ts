import { describe, expect, it } from "vitest";
import {
  collectionSortLabel,
  filterAndSortCollectionProducts,
  parseCollectionSort,
} from "@/lib/catalog/collection-storefront-sort";
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

describe("collectionSortLabel", () => {
  it("returns null for default catalog order", () => {
    expect(collectionSortLabel("default")).toBeNull();
  });

  it("returns label for explicit sorts", () => {
    expect(collectionSortLabel("price-asc")).toBe("Preis aufsteigend");
  });
});

describe("parseCollectionSort", () => {
  it("accepts known sort values", () => {
    expect(parseCollectionSort("created-desc")).toBe("created-desc");
    expect(parseCollectionSort("title-asc")).toBe("title-asc");
    expect(parseCollectionSort("price-asc")).toBe("price-asc");
    expect(parseCollectionSort("price-desc")).toBe("price-desc");
  });

  it("falls back to default for unknown or missing values", () => {
    expect(parseCollectionSort(undefined)).toBe("default");
    expect(parseCollectionSort("")).toBe("default");
    expect(parseCollectionSort("price")).toBe("default");
  });
});

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

  it("sorts by price descending", () => {
    const products = [
      card({ id: "a", title: "A" }, { priceGrossCents: 3000 }),
      card({ id: "b", title: "B" }, { priceGrossCents: 1000 }),
    ];
    const out = filterAndSortCollectionProducts(products, {
      sort: "price-desc",
      onlyAvailable: false,
    });
    expect(out.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("sorts by title ascending with German locale", () => {
    const products = [
      card({ id: "b", title: "Ölbaum" }),
      card({ id: "a", title: "Apfel" }),
      card({ id: "c", title: "Banane" }),
    ];
    const out = filterAndSortCollectionProducts(products, {
      sort: "title-asc",
      onlyAvailable: false,
    });
    expect(out.map((p) => p.title)).toEqual(["Apfel", "Banane", "Ölbaum"]);
  });

  it("sorts by createdAt descending", () => {
    const products = [
      card({ id: "a", title: "A", createdAt: "2026-01-01T00:00:00.000Z" }),
      card({ id: "b", title: "B", createdAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const out = filterAndSortCollectionProducts(products, {
      sort: "created-desc",
      onlyAvailable: false,
    });
    expect(out.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("keeps catalog order for default sort", () => {
    const products = [
      card({ id: "c", title: "C" }),
      card({ id: "a", title: "A" }),
      card({ id: "b", title: "B" }),
    ];
    const out = filterAndSortCollectionProducts(products, {
      sort: "default",
      onlyAvailable: false,
    });
    expect(out.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });
});
