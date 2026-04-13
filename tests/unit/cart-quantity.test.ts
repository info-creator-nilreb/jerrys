import { describe, expect, it } from "vitest";
import {
  clampToValidQuantity,
  defaultAddQuantity,
  isValidCartQuantity,
  maxSelectableQuantity,
  nextQuantityStep,
} from "@/lib/cart/quantity";

describe("cart quantity rules", () => {
  it("accepts min and steps", () => {
    const p = { availableQuantity: 20, minOrderQty: 5, purchaseStep: 5, maxOrderQty: null as number | null };
    expect(isValidCartQuantity(p, 5)).toBe(true);
    expect(isValidCartQuantity(p, 7)).toBe(false);
    expect(isValidCartQuantity(p, 15)).toBe(true);
  });

  it("default add uses min when valid", () => {
    const p = { availableQuantity: 10, minOrderQty: 2, purchaseStep: 2, maxOrderQty: null };
    expect(defaultAddQuantity(p)).toBe(2);
  });

  it("default add null when stock below min", () => {
    const p = { availableQuantity: 1, minOrderQty: 5, purchaseStep: 1, maxOrderQty: null };
    expect(defaultAddQuantity(p)).toBeNull();
  });

  it("next step increases by purchaseStep", () => {
    const p = { availableQuantity: 20, minOrderQty: 1, purchaseStep: 3, maxOrderQty: null };
    expect(nextQuantityStep(p, 1)).toBe(4);
  });

  it("next step null when no higher valid qty", () => {
    const p = { availableQuantity: 12, minOrderQty: 5, purchaseStep: 5, maxOrderQty: null };
    expect(nextQuantityStep(p, 10)).toBeNull();
  });

  it("clamp respects max order", () => {
    const p = { availableQuantity: 100, minOrderQty: 1, purchaseStep: 1, maxOrderQty: 7 };
    expect(clampToValidQuantity(p, 99)).toBe(7);
  });

  it("max selectable uses stock and max order", () => {
    const p = { availableQuantity: 50, minOrderQty: 2, purchaseStep: 1, maxOrderQty: 10 };
    expect(maxSelectableQuantity(p)).toBe(10);
    const p2 = { availableQuantity: 8, minOrderQty: 1, purchaseStep: 1, maxOrderQty: null as number | null };
    expect(maxSelectableQuantity(p2)).toBe(8);
  });
});
