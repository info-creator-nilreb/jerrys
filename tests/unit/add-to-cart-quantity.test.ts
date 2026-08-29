import { describe, expect, it } from "vitest";
import { resolveAddToCartNextQuantity } from "@/lib/cart/add-to-cart-quantity";

const rules = {
  availableQuantity: 20,
  minOrderQty: 1,
  purchaseStep: 1,
  maxOrderQty: null as number | null,
};

describe("resolveAddToCartNextQuantity", () => {
  it("legt erste Position mit expliziter Menge an", () => {
    expect(resolveAddToCartNextQuantity(rules, null, 1)).toEqual({
      ok: true,
      nextQty: 1,
      addedQuantity: 1,
    });
  });

  it("addiert explizite Menge bei bestehender Position", () => {
    expect(resolveAddToCartNextQuantity(rules, 1, 1)).toEqual({
      ok: true,
      nextQty: 2,
      addedQuantity: 1,
    });
    expect(resolveAddToCartNextQuantity(rules, 2, 1)).toEqual({
      ok: true,
      nextQty: 3,
      addedQuantity: 1,
    });
  });

  it("addiert mehrere Stück pro Klick", () => {
    expect(resolveAddToCartNextQuantity(rules, null, 3)).toEqual({
      ok: true,
      nextQty: 3,
      addedQuantity: 3,
    });
    expect(resolveAddToCartNextQuantity(rules, 3, 2)).toEqual({
      ok: true,
      nextQty: 5,
      addedQuantity: 2,
    });
  });

  it("lehnt ab wenn Maximum erreicht", () => {
    const capped = { ...rules, maxOrderQty: 2 };
    const result = resolveAddToCartNextQuantity(capped, 2, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Maximale Menge");
    }
  });
});
