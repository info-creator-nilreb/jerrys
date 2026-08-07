import { describe, expect, it } from "vitest";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
  variantOptionLabel,
} from "@/lib/catalog/default-variant-storefront";

describe("default-variant-storefront", () => {
  it("pickDefaultVariant bevorzugt isDefault", () => {
    const defaultV = {
      id: "v1",
      sku: "SKU-1",
      title: null,
      isDefault: true,
      priceGrossCents: 1000,
      availableQuantity: 5,
      minOrderQty: 1,
      purchaseStep: 1,
      maxOrderQty: null,
      deliveryTimeKey: null,
    };
    const other = { ...defaultV, id: "v2", sku: "SKU-2", isDefault: false };
    expect(pickDefaultVariant({ variants: [other, defaultV] })).toEqual(defaultV);
    expect(pickDefaultVariant({ variants: [] })).toBeNull();
  });

  it("quantityRulesFromVariant mappt Felder", () => {
    expect(
      quantityRulesFromVariant({
        id: "v1",
        sku: "X",
        title: null,
        isDefault: true,
        priceGrossCents: 1,
        availableQuantity: 3,
        minOrderQty: 2,
        purchaseStep: 2,
        maxOrderQty: 10,
        deliveryTimeKey: "2-4-werktage",
      }),
    ).toEqual({
      availableQuantity: 3,
      minOrderQty: 2,
      purchaseStep: 2,
      maxOrderQty: 10,
    });
  });

  it("variantOptionLabel nutzt Titel oder SKU", () => {
    expect(variantOptionLabel({ title: " Rot ", sku: "A" })).toBe("Rot");
    expect(variantOptionLabel({ title: null, sku: "A" })).toBe("A");
  });
});
