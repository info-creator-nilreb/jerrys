import { describe, expect, it } from "vitest";
import { cartAllowsPickup } from "@/lib/checkout/cart-pickup-eligibility";

describe("cartAllowsPickup", () => {
  it("ist true wenn alle Artikel Abholung erlauben", () => {
    expect(
      cartAllowsPickup([
        { product: { pickupAvailable: true } },
        { product: { pickupAvailable: true } },
      ]),
    ).toBe(true);
  });

  it("ist false bei gemischtem Warenkorb", () => {
    expect(
      cartAllowsPickup([
        { product: { pickupAvailable: true } },
        { product: { pickupAvailable: false } },
      ]),
    ).toBe(false);
  });

  it("ist false bei leerem Warenkorb", () => {
    expect(cartAllowsPickup([])).toBe(false);
  });
});
