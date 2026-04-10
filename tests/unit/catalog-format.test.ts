import { describe, expect, it } from "vitest";
import {
  centsToPriceInputString,
  formatPrice,
  parseEuroInputToCents,
} from "@/lib/catalog/format";

describe("parseEuroInputToCents", () => {
  it("parses German-style decimals", () => {
    expect(parseEuroInputToCents("79,00")).toBe(7900);
    expect(parseEuroInputToCents("79")).toBe(7900);
  });

  it("rejects invalid input", () => {
    expect(parseEuroInputToCents("")).toBeNull();
    expect(parseEuroInputToCents("abc")).toBeNull();
    expect(parseEuroInputToCents("-1")).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats cents as EUR in de-DE", () => {
    expect(formatPrice(7900)).toMatch(/79/);
  });
});

describe("centsToPriceInputString", () => {
  it("round-trips with parseEuroInputToCents for typical prices", () => {
    const cents = 7900;
    const s = centsToPriceInputString(cents);
    expect(parseEuroInputToCents(s)).toBe(cents);
  });
});
