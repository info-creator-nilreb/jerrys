import { describe, expect, it } from "vitest";
import {
  clampToValidQuantity,
  defaultAddQuantity,
  isValidCartQuantity,
  nextQuantityStep,
} from "@/lib/cart/quantity";

describe("cart quantity rules", () => {
  it("accepts min and steps", () => {
    const p = { stockQuantity: 20, minOrderQty: 5, purchaseStep: 5, maxOrderQty: null as number | null };
    expect(isValidCartQuantity(p, 5)).toBe(true);
    expect(isValidCartQuantity(p, 7)).toBe(false);
    expect(isValidCartQuantity(p, 15)).toBe(true);
  });

  it("default add uses min when valid", () => {
    const p = { stockQuantity: 10, minOrderQty: 2, purchaseStep: 2, maxOrderQty: null };
    expect(defaultAddQuantity(p)).toBe(2);
  });

  it("default add null when stock below min", () => {
    const p = { stockQuantity: 1, minOrderQty: 5, purchaseStep: 1, maxOrderQty: null };
    expect(defaultAddQuantity(p)).toBeNull();
  });

  it("next step increases by purchaseStep", () => {
    const p = { stockQuantity: 20, minOrderQty: 1, purchaseStep: 3, maxOrderQty: null };
    expect(nextQuantityStep(p, 1)).toBe(4);
  });

  it("next step null when no higher valid qty", () => {
    const p = { stockQuantity: 12, minOrderQty: 5, purchaseStep: 5, maxOrderQty: null };
    expect(nextQuantityStep(p, 10)).toBeNull();
  });

  it("clamp respects max order", () => {
    const p = { stockQuantity: 100, minOrderQty: 1, purchaseStep: 1, maxOrderQty: 7 };
    expect(clampToValidQuantity(p, 99)).toBe(7);
  });
});
