import { describe, expect, it } from "vitest";
import {
  filterProductsByStorefrontSearch,
  parseStorefrontSearchQuery,
  productMatchesStorefrontSearch,
} from "@/lib/catalog/storefront-product-search";

describe("parseStorefrontSearchQuery", () => {
  it("returns null for missing, blank, or too-short queries", () => {
    expect(parseStorefrontSearchQuery(undefined)).toBeNull();
    expect(parseStorefrontSearchQuery("")).toBeNull();
    expect(parseStorefrontSearchQuery(" a ")).toBeNull();
  });

  it("trims and accepts queries with at least 2 characters", () => {
    expect(parseStorefrontSearchQuery("  ab  ")).toBe("ab");
    expect(parseStorefrontSearchQuery("Höhle")).toBe("Höhle");
  });

  it("caps query length at 100 characters", () => {
    const long = "x".repeat(120);
    expect(parseStorefrontSearchQuery(long)?.length).toBe(100);
  });
});

describe("productMatchesStorefrontSearch", () => {
  const product = {
    title: "Katzenhöhle Premium",
    slug: "katzenhoehle-premium",
    subtitle: "Mit Sisal-Plüsch",
  };

  it("matches title, slug, and subtitle case-insensitively", () => {
    expect(productMatchesStorefrontSearch(product, "höhle")).toBe(true);
    expect(productMatchesStorefrontSearch(product, "KATZENHOEHLE")).toBe(true);
    expect(productMatchesStorefrontSearch(product, "sisal")).toBe(true);
  });

  it("rejects non-matching terms", () => {
    expect(productMatchesStorefrontSearch(product, "baum")).toBe(false);
  });
});

describe("filterProductsByStorefrontSearch", () => {
  const products = [
    { id: "1", title: "Alpha", slug: "alpha", subtitle: null },
    { id: "2", title: "Beta Box", slug: "beta-box", subtitle: "Extra" },
  ];

  it("returns all products when query is null", () => {
    expect(filterProductsByStorefrontSearch(products, null)).toEqual(products);
  });

  it("filters by query", () => {
    const out = filterProductsByStorefrontSearch(products, "beta");
    expect(out.map((p) => p.id)).toEqual(["2"]);
  });
});
