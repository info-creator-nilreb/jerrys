import { describe, expect, it } from "vitest";
import {
  countryCodeFromValue,
  countryDisplayName,
  normalizeCountrySearchText,
} from "@/lib/catalog/iso-countries-de";
import {
  customAttributesOnly,
  migrateLegacySpecsIntoAttributes,
  readStandardSpecValues,
} from "@/lib/catalog/standard-product-attributes";

describe("iso-countries-de", () => {
  it("mappt deutsche und englische Ländernamen", () => {
    expect(countryCodeFromValue("Deutschland")).toBe("DE");
    expect(countryCodeFromValue("Made in Germany")).toBe("DE");
    expect(countryCodeFromValue("Österreich")).toBe("AT");
    expect(countryCodeFromValue("Oesterreich")).toBe("AT");
    expect(countryCodeFromValue("United Kingdom")).toBe("GB");
  });

  it("normalisiert Suchtext", () => {
    expect(normalizeCountrySearchText("  Made in Germany! ")).toBe("germany");
  });

  it("zeigt ISO-Code als deutschen Namen", () => {
    expect(countryDisplayName("DE")).toBe("Deutschland");
  });
});

describe("standard-product-attributes Herkunft", () => {
  it("mappt altes Merkmal custom.herkunft auf ISO-Dropdown", () => {
    const attrs = migrateLegacySpecsIntoAttributes([
      { key: "custom.herkunft", label: "Herkunft", values: ["Deutschland"] },
    ]);
    expect(readStandardSpecValues(attrs).originCountryCode).toBe("DE");
    expect(attrs.find((a) => a.key === "custom.herstellungsland")?.values).toEqual(["DE"]);
    expect(customAttributesOnly(attrs).some((a) => a.key === "custom.herkunft")).toBe(false);
  });

  it("mappt Label Herkunft ohne Standard-Key", () => {
    const specs = readStandardSpecValues([
      { key: "custom.land", label: "Herkunft", values: ["Made in Germany"] },
    ]);
    expect(specs.originCountryCode).toBe("DE");
  });

  it("behält bereits gespeicherten ISO-Code", () => {
    expect(
      readStandardSpecValues([
        { key: "custom.herstellungsland", label: "Herstellungsland", values: ["CH"] },
      ]).originCountryCode,
    ).toBe("CH");
  });
});
