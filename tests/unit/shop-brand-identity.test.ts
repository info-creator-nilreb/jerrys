import { describe, expect, it } from "vitest";
import { isEdelweissShopName } from "@/lib/shop/shop-brand-identity";

describe("isEdelweissShopName", () => {
  it("erkennt Edel-weiss-Schreibweisen", () => {
    expect(isEdelweissShopName("edel weiss")).toBe(true);
    expect(isEdelweissShopName("Edelweiss Designs")).toBe(true);
    expect(isEdelweissShopName("Edel Weiss")).toBe(true);
  });

  it("lehnt andere Shopnamen ab", () => {
    expect(isEdelweissShopName("jerry's")).toBe(false);
    expect(isEdelweissShopName("")).toBe(false);
    expect(isEdelweissShopName(null)).toBe(false);
  });
});
