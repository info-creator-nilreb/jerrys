import { describe, expect, it } from "vitest";
import {
  geoCountryFromHeaders,
  resolvePreferredShippingCountry,
} from "@/lib/shop/preferred-shipping-country";

describe("resolvePreferredShippingCountry", () => {
  it("nimmt DE, wenn belieferbar (nicht das alphabetisch erste Land)", () => {
    expect(resolvePreferredShippingCountry(["AT", "DE"])).toBe("DE");
  });

  it("bevorzugt das Geo-Land, wenn es belieferbar ist", () => {
    expect(resolvePreferredShippingCountry(["AT", "DE"], "AT")).toBe("AT");
    expect(resolvePreferredShippingCountry(["AT", "DE"], "at")).toBe("AT");
  });

  it("ignoriert Geo-Länder ohne Versand", () => {
    expect(resolvePreferredShippingCountry(["AT", "DE"], "FR")).toBe("DE");
  });

  it("fällt auf das erste Land zurück, wenn DE nicht belieferbar ist", () => {
    expect(resolvePreferredShippingCountry(["AT", "CH"])).toBe("AT");
    expect(resolvePreferredShippingCountry(["AT", "CH"], "CH")).toBe("CH");
  });

  it("liefert DE bei leerer Länderliste", () => {
    expect(resolvePreferredShippingCountry([])).toBe("DE");
    expect(resolvePreferredShippingCountry(["", "X"])).toBe("DE");
  });
});

describe("geoCountryFromHeaders", () => {
  function headers(map: Record<string, string>) {
    return { get: (name: string) => map[name] ?? null };
  }

  it("liest den Vercel-Header", () => {
    expect(geoCountryFromHeaders(headers({ "x-vercel-ip-country": "at" }))).toBe("AT");
  });

  it("liest Cloudflare als Alternative", () => {
    expect(geoCountryFromHeaders(headers({ "cf-ipcountry": "CH" }))).toBe("CH");
  });

  it("ignoriert unbrauchbare Werte", () => {
    expect(geoCountryFromHeaders(headers({ "x-vercel-ip-country": "XX1" }))).toBeNull();
    expect(geoCountryFromHeaders(headers({}))).toBeNull();
  });
});
