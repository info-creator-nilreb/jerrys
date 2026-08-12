import { describe, expect, it } from "vitest";
import {
  attributesFromFormData,
  attributesToFormText,
  extractAttributesFromShopifyRow,
  parseAttributesFormText,
  parseMetafieldHeader,
  slugifyAttributeKey,
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

  it("roundtrip Formulartext (Legacy)", () => {
    const text = attributesToFormText([
      { key: "custom.farbe", label: "Farbe", values: ["gold", "beige"] },
    ]);
    expect(parseAttributesFormText(text)).toEqual([
      { key: "custom.farbe", label: "Farbe", values: ["gold", "beige"] },
    ]);
  });

  it("liest Admin-Zeilen aus FormData", () => {
    const fd = new FormData();
    fd.append("attributeKey", "custom.farbe");
    fd.append("attributeLabel", "Farbe");
    fd.append("attributeValues", "beige, gold");
    fd.append("attributeKey", "");
    fd.append("attributeLabel", "Design");
    fd.append("attributeValues", "Band");
    const attrs = attributesFromFormData(fd);
    expect(attrs).toEqual([
      { key: "custom.farbe", label: "Farbe", values: ["beige", "gold"] },
      { key: "custom.design", label: "Design", values: ["Band"] },
    ]);
  });

  it("slugifyAttributeKey erzeugt custom.* Keys", () => {
    expect(slugifyAttributeKey("Schmuckmaterial")).toBe("custom.schmuckmaterial");
  });

  it("erzeugt technische SKU ohne Produktname", () => {
    const used = new Set<string>();
    expect(technicalImportSku("abc123", 0, 1, used)).toBe("SKU-abc123");
    expect(technicalImportSku("abc123", 0, 2, used)).toBe("SKU-abc123-1");
  });
});
