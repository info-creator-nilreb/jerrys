import { describe, expect, it } from "vitest";
import {
  BESTSELLER_MIN_UNITS,
  pickBestsellerProductIds,
} from "@/lib/catalog/bestseller-rank";

describe("pickBestsellerProductIds", () => {
  it("vergibt Badge nur ab Mindestmenge und Top-Anteil", () => {
    const ranks = [
      { productId: "a", unitsSold: 20 },
      { productId: "b", unitsSold: 10 },
      { productId: "c", unitsSold: 5 },
      { productId: "d", unitsSold: 2 },
      { productId: "e", unitsSold: 1 },
    ];
    const ids = pickBestsellerProductIds(ranks, 20);
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);
    expect(ids.has("c")).toBe(true);
    expect(ids.has("d")).toBe(false);
    expect(ids.size).toBeLessThanOrEqual(12);
  });

  it("ignoriert Produkte unter Mindestmenge", () => {
    const ranks = [{ productId: "solo", unitsSold: BESTSELLER_MIN_UNITS - 1 }];
    expect(pickBestsellerProductIds(ranks, 5).has("solo")).toBe(false);
  });

  it("liefert leeres Set ohne Verkäufe", () => {
    expect(pickBestsellerProductIds([], 10).size).toBe(0);
  });
});
