import { describe, expect, it } from "vitest";
import {
  pickDefaultVariant,
  quantityRulesFromVariant,
} from "@/lib/catalog/default-variant-storefront";

describe("default-variant-storefront", () => {
  it("pickDefaultVariant liefert erste Variante", () => {
    const v = {
      id: "v1",
      sku: "SKU-1",
      priceGrossCents: 1000,
      availableQuantity: 5,
      minOrderQty: 1,
      purchaseStep: 1,
      maxOrderQty: null,
      deliveryTimeKey: null,
    };
    expect(pickDefaultVariant({ variants: [v] })).toEqual(v);
    expect(pickDefaultVariant({ variants: [] })).toBeNull();
  });

  it("quantityRulesFromVariant mappt Felder", () => {
    expect(
      quantityRulesFromVariant({
        id: "v1",
        sku: "X",
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
});
