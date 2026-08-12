import { describe, expect, it } from "vitest";
import {
  attributesToFormText,
  extractAttributesFromShopifyRow,
  parseAttributesFormText,
  parseMetafieldHeader,
  technicalImportSku,
} from "@/features/catalog/domain/product-attributes";

describe("product-attributes", () => {
  it("parst Shopify-Spaltenheader", () => {
    const meta = parseMetafieldHeader(
      "Schmuckmaterial (product.metafields.shopify.jewelry-material)",
    );
    expect(meta).toEqual({
      label: "Schmuckmaterial",
      namespace: "shopify",
      key: "jewelry-material",
      fullKey: "shopify.jewelry-material",
    });
  });

  it("extrahiert Mehrfachwerte aus CSV-Zeile", () => {
    const attrs = extractAttributesFromShopifyRow({
      "Farbe (product.metafields.custom.farbe)": "beige, schwarz, gold",
      "Lieferzeit (product.metafields.custom.lieferzeit)": "In 3 Tagen",
      "Schmuckmaterial (product.metafields.shopify.jewelry-material)": "Gold; Perlen",
    });
    expect(attrs.find((a) => a.key === "custom.lieferzeit")).toBeUndefined();
    expect(attrs.find((a) => a.key === "custom.farbe")?.values).toEqual([
      "beige",
      "schwarz",
      "gold",
    ]);
    expect(attrs.find((a) => a.key === "shopify.jewelry-material")?.label).toBe(
      "Schmuckmaterial",
    );
  });

  it("roundtrip Formulartext", () => {
    const text = attributesToFormText([
      { key: "custom.farbe", label: "Farbe", values: ["gold", "beige"] },
    ]);
    expect(parseAttributesFormText(text)).toEqual([
      { key: "custom.farbe", label: "Farbe", values: ["gold", "beige"] },
    ]);
  });

  it("erzeugt technische SKU ohne Produktname", () => {
    const used = new Set<string>();
    expect(technicalImportSku("abc123", 0, 1, used)).toBe("SKU-abc123");
    expect(technicalImportSku("abc123", 0, 2, used)).toBe("SKU-abc123-1");
  });
});
