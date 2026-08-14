import { describe, expect, it } from "vitest";
import {
  matchOrderLineToCatalog,
  normalizeCatalogMatchText,
  parseShopifyLineItemName,
  titleVariantMatchKey,
  type CatalogMatchEntry,
  type CatalogMatchIndex,
} from "@/features/orders";

function entry(overrides: Partial<CatalogMatchEntry> & Pick<CatalogMatchEntry, "productId">): CatalogMatchEntry {
  return {
    productVariantId: "var-1",
    taxRatePercent: 19,
    sku: "ring-m",
    productTitle: "Gold Ring",
    variantTitle: "Size M",
    slug: "gold-ring",
    ...overrides,
  };
}

function index(partial: Partial<CatalogMatchIndex>): CatalogMatchIndex {
  return {
    bySku: new Map(),
    byTitleAndVariant: new Map(),
    byTitleDefault: new Map(),
    ambiguousTitles: new Set(),
    ...partial,
  };
}

describe("parseShopifyLineItemName", () => {
  it("trennt Produkttitel und Variante", () => {
    expect(parseShopifyLineItemName("Gold Ring - Size M")).toEqual({
      productTitle: "Gold Ring",
      variantTitle: "Size M",
    });
    expect(parseShopifyLineItemName("Silver Bracelet")).toEqual({
      productTitle: "Silver Bracelet",
      variantTitle: null,
    });
  });
});

describe("matchOrderLineToCatalog", () => {
  it("matcht über SKU", () => {
    const e = entry({ productId: "p1", sku: "ring-m" });
    const result = matchOrderLineToCatalog({
      sku: "ring-m",
      lineTitle: "Gold Ring - Size M",
      index: index({ bySku: new Map([["ring-m", e]]) }),
    });
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.method).toBe("sku");
      expect(result.entry.productId).toBe("p1");
    }
  });

  it("matcht über Titel und Variante ohne SKU", () => {
    const e = entry({ productId: "p2", sku: "gold-ring-size-m", variantTitle: "Size M" });
    const tvKey = titleVariantMatchKey("Gold Ring", "Size M");
    const result = matchOrderLineToCatalog({
      sku: "",
      lineTitle: "Gold Ring - Size M",
      index: index({ byTitleAndVariant: new Map([[tvKey, e]]) }),
    });
    expect(result).toEqual({ matched: true, entry: e, method: "title_variant" });
  });

  it("matcht Default-Variante nur über Produkttitel", () => {
    const e = entry({
      productId: "p3",
      sku: "silver-bracelet",
      productTitle: "Silver Bracelet",
      variantTitle: null,
    });
    const titleNorm = normalizeCatalogMatchText("Silver Bracelet");
    const result = matchOrderLineToCatalog({
      sku: "",
      lineTitle: "Silver Bracelet",
      index: index({ byTitleDefault: new Map([[titleNorm, e]]) }),
    });
    expect(result).toEqual({ matched: true, entry: e, method: "title_default" });
  });

  it("lehnt mehrdeutige Produkttitel ab", () => {
    const result = matchOrderLineToCatalog({
      sku: "",
      lineTitle: "Duplicate Title",
      index: index({ ambiguousTitles: new Set([normalizeCatalogMatchText("Duplicate Title")]) }),
    });
    expect(result).toEqual({ matched: false, reason: "ambiguous_title" });
  });
});
