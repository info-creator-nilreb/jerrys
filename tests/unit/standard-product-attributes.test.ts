import { describe, expect, it } from "vitest";
import {
  applyStandardSpecsToAttributes,
  migrateLegacySpecsIntoAttributes,
  readStandardSpecValues,
  specTextsFromAttributes,
} from "@/lib/catalog/standard-product-attributes";

describe("standard-product-attributes", () => {
  it("migriert Legacy-Textfelder in Merkmale", () => {
    const attrs = migrateLegacySpecsIntoAttributes([], {
      dimensionsText: "10 × 10 cm",
      weightText: "200 g",
      materialText: "Holz",
    });
    const specs = readStandardSpecValues(attrs);
    expect(specs.dimensions).toBe("10 × 10 cm");
    expect(specs.weight).toBe("200 g");
    expect(specs.material).toBe("Holz");
  });

  it("speichert Herstellungsland als ISO-Code", () => {
    const attrs = applyStandardSpecsToAttributes([], {
      dimensions: "",
      weight: "",
      material: "",
      originCountryCode: "DE",
    });
    expect(attrs.find((a) => a.key === "custom.herstellungsland")?.values).toEqual(["DE"]);
    const texts = specTextsFromAttributes(attrs);
    expect(texts.originDisplay).toBe("Deutschland");
  });
});
