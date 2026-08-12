import { describe, expect, it } from "vitest";
import {
  resolvePdpDisplay,
  resolvePdpProductFamily,
} from "@/lib/catalog/pdp-resolve-display";

describe("resolvePdpProductFamily", () => {
  it("erkennt Schmuck", () => {
    expect(
      resolvePdpProductFamily({
        title: "Armband Candy",
        attributes: [{ key: "custom.material", label: "Material", values: ["Resin"] }],
      }),
    ).toBe("jewelry");
  });

  it("erkennt Tierprodukte", () => {
    expect(
      resolvePdpProductFamily({
        title: "Design Katzenhöhle",
        categorySlugs: ["katze"],
      }),
    ).toBe("pet");
  });
});

describe("resolvePdpDisplay", () => {
  it("baut Specs und Eigenschaften nur aus Stammdaten", () => {
    const d = resolvePdpDisplay({
      slug: "armband-candy",
      title: "Armband Candy",
      leadText: null,
      dimensionsText: null,
      weightText: "30 g",
      materialText: "Resin, Edelstahl 12 K vergoldet",
      featureBullets: [],
      attributes: [
        {
          key: "custom.herstellungsland",
          label: "Herstellungsland",
          values: ["Deutschland"],
        },
        { key: "custom.farbe", label: "Farbe", values: ["gold"] },
        { key: "theme.label", label: "Product label", values: ["Made by me"] },
      ],
    });

    expect(d.leftSpecs.map((s) => s.label)).toEqual(["Gewicht", "Material"]);
    expect(d.propertySpecs.some((s) => s.label === "Herkunft" && s.value === "Deutschland")).toBe(
      true,
    );
    expect(d.propertySpecs.some((s) => s.label === "Farbe" && s.value === "gold")).toBe(true);
    expect(d.propertiesIcon).toBe("gem");
    expect(d.usps.some((u) => u.title === "Made in Germany" && u.icon === "flag-de")).toBe(
      true,
    );
    expect(d.usps.some((u) => u.title === "Made by me")).toBe(true);
    expect(d.usps.every((u) => u.title !== "Sicher & geborgen")).toBe(true);
  });

  it("zeigt keine erfundenen Katzen-USPs ohne Daten", () => {
    const d = resolvePdpDisplay({
      slug: "plain",
      title: "Plain",
      leadText: null,
      dimensionsText: null,
      weightText: null,
      materialText: null,
      featureBullets: [],
      attributes: [],
    });
    expect(d.leftSpecs).toEqual([]);
    expect(d.propertySpecs).toEqual([]);
    expect(d.propertyLines).toEqual([]);
    expect(d.usps).toEqual([]);
  });

  it("nutzt Pfoten-Icon nur bei Tier-Familie", () => {
    const d = resolvePdpDisplay({
      slug: "design-katzenhoehle",
      title: "Design Katzenhöhle",
      leadText: null,
      dimensionsText: "50 cm",
      weightText: null,
      materialText: null,
      featureBullets: ["Stabil & langlebig"],
      attributes: [],
    });
    expect(d.family).toBe("pet");
    expect(d.propertiesIcon).toBe("paw");
    expect(d.usps.some((u) => u.title === "Stabil & langlebig")).toBe(true);
  });
});
