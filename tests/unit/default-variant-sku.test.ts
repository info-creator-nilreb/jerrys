import { describe, expect, it } from "vitest";
import { defaultVariantSku } from "@/features/catalog";

describe("defaultVariantSku", () => {
  it("nutzt product_number wenn gesetzt", () => {
    expect(defaultVariantSku({ id: "clxyz", productNumber: " ART-1 " })).toBe("ART-1");
  });

  it("fallback SKU-<productId> ohne Artikelnummer", () => {
    expect(defaultVariantSku({ id: "clxyz", productNumber: null })).toBe("SKU-clxyz");
    expect(defaultVariantSku({ id: "clxyz", productNumber: "  " })).toBe("SKU-clxyz");
  });
});
