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
  it("baut kuratierte Specs und Galerie-Badge aus Stammdaten", () => {
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

    expect(d.galleryBadgeLabel).toBe("Made by me");
    expect(d.visibleSpecs.map((s) => s.label)).toEqual(["Material", "Farbe", "Herkunft", "Gewicht"]);
    expect(d.propertySpecs.some((s) => s.label === "Herkunft" && s.value === "Deutschland")).toBe(
      true,
    );
    expect(d.propertiesIcon).toBe("gem");
    expect(d.usps.some((u) => u.title === "Made in Germany")).toBe(false);
    expect(d.usps.some((u) => u.title === "Made by me")).toBe(false);
    expect(d.usps.every((u) => u.title !== "Sicher & geborgen")).toBe(true);
  });

  it("dedupliziert Farbe und blendet Filter-Merkmale aus", () => {
    const d = resolvePdpDisplay({
      slug: "kette-coffee",
      title: "Kette Coffee",
      leadText: null,
      dimensionsText: "50 cm",
      weightText: null,
      materialText: "Steel vergoldet",
      featureBullets: [],
      attributes: [
        { key: "custom.farbe", label: "Farbe", values: ["gold"] },
        { key: "shopify.color-pattern", label: "Farbe", values: ["weiss"] },
        { key: "shopify.jewelry-material", label: "Schmuckmaterial", values: ["edelstahl"] },
        { key: "shopify.age-group", label: "Altersgruppe", values: ["erwachsene"] },
        { key: "shopify.target-gender", label: "Zielgeschlecht", values: ["weiblich"] },
      ],
    });

    expect(d.visibleSpecs.filter((s) => s.label === "Farbe")).toHaveLength(1);
    expect(d.visibleSpecs.find((s) => s.label === "Farbe")?.value).toBe("gold, weiss");
    expect(d.visibleSpecs.some((s) => s.label === "Altersgruppe")).toBe(false);
    expect(d.visibleSpecs.some((s) => s.label === "Schmuckmaterial")).toBe(false);
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
    expect(d.visibleSpecs).toEqual([]);
    expect(d.extraSpecs).toEqual([]);
    expect(d.usps).toEqual([]);
    expect(d.galleryBadgeLabel).toBeNull();
  });

  it("zieht Herkunft aus alten Stichpunkten als Merkmal", () => {
    const d = resolvePdpDisplay({
      slug: "ring",
      title: "Ring Shell",
      leadText: null,
      dimensionsText: null,
      weightText: null,
      materialText: null,
      featureBullets: ["Herkunft: Deutschland"],
      attributes: [],
    });
    expect(d.visibleSpecs.some((s) => s.label === "Herkunft" && s.value === "Deutschland")).toBe(
      true,
    );
    expect(d.usps.some((u) => u.title === "Made in Germany")).toBe(false);
  });

  it("zeigt freie Verkaufsargumente nur als USPs, nicht als Stichpunktliste", () => {
    const d = resolvePdpDisplay({
      slug: "design-katzenhoehle",
      title: "Design Katzenhöhle",
      leadText: null,
      dimensionsText: "ca. 50 × 40 × 35 cm",
      weightText: "ca. 2,1 kg",
      materialText: "Kunststoff",
      featureBullets: [
        "Stabil & langlebig",
        "Pflegeleicht abwischbar",
        "Angenehm geschlossene Form",
      ],
      attributes: [
        {
          key: "custom.herstellungsland",
          label: "Herstellungsland",
          values: ["Deutschland"],
        },
      ],
    });
    expect(d.usps.map((u) => u.title)).toEqual([
      "Stabil & langlebig",
      "Pflegeleicht abwischbar",
      "Angenehm geschlossene Form",
    ]);
    expect(d.usps.some((u) => u.title === "Made in Germany")).toBe(false);
    expect(new Set(d.usps.map((u) => u.icon)).size).toBeGreaterThanOrEqual(2);
  });

  it("füllt freie USP-Slots mit Made in Germany nur ohne Herkunft-Spec", () => {
    const d = resolvePdpDisplay({
      slug: "ring",
      title: "Ring",
      leadText: null,
      dimensionsText: null,
      weightText: null,
      materialText: null,
      featureBullets: ["Handgearbeitet"],
      attributes: [
        {
          key: "custom.herstellungsland",
          label: "Herstellungsland",
          values: ["Österreich"],
        },
      ],
    });
    expect(d.usps[0]?.title).toBe("Handgearbeitet");
    expect(d.usps.some((u) => u.title === "Made in Germany")).toBe(false);
  });

  it("verschiebt Specs über das sichtbare Limit in extraSpecs", () => {
    const d = resolvePdpDisplay({
      slug: "detailreich",
      title: "Detailreich",
      leadText: null,
      dimensionsText: "10 cm",
      weightText: "20 g",
      materialText: "Holz",
      featureBullets: [],
      attributes: [
        { key: "custom.farbe", label: "Farbe", values: ["braun"] },
        { key: "custom.herstellungsland", label: "Herkunft", values: ["Deutschland"] },
        { key: "custom.pflege", label: "Pflege", values: ["abwischbar"] },
      ],
    });
    expect(d.visibleSpecs.length).toBeLessThanOrEqual(4);
    expect(d.extraSpecs.length).toBeGreaterThan(0);
  });
});
