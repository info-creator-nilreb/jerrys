import { describe, expect, it } from "vitest";
import {
  buildProductSearchDocument,
  resolveSearchAvailability,
} from "@/features/catalog";

describe("resolveSearchAvailability", () => {
  it("nutzt inStock wenn gesetzt", () => {
    expect(resolveSearchAvailability({ inStock: true })).toBe("available");
    expect(resolveSearchAvailability({ inStock: false })).toBe("unavailable");
  });

  it("fällt auf availableQuantityTotal zurück", () => {
    expect(resolveSearchAvailability({ availableQuantityTotal: 3 })).toBe("available");
    expect(resolveSearchAvailability({ availableQuantityTotal: 0 })).toBe("unavailable");
  });
});

describe("buildProductSearchDocument", () => {
  it("baut Klartext aus Titel, Beschreibung, Kategorie und Verfügbarkeit", () => {
    const doc = buildProductSearchDocument({
      productId: "p1",
      isActive: true,
      title: "Räucherbox Deluxe",
      subtitle: "Für zu Hause",
      descriptionHtml: "<p>Holzbox mit <strong>Deckel</strong></p>",
      categoryTitles: ["Räuchern", "Zubehör"],
      collectionTitles: ["Bestsellers"],
      featureBullets: ["Handgemacht", "Nachhaltig"],
      attributes: [{ key: "material", label: "Material", values: ["Eiche"] }],
      availableQuantityTotal: 2,
    });

    expect(doc.indexable).toBe(true);
    expect(doc.documentText).toContain("Räucherbox Deluxe");
    expect(doc.documentText).toContain("Holzbox mit Deckel");
    expect(doc.documentText).toContain("Räuchern");
    expect(doc.documentText).toContain("Material: Eiche");
    expect(doc.documentText).toContain("Verfügbarkeit: available");
    expect(doc.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(doc.documentText).not.toContain("<p>");
    expect(doc.documentText).not.toMatch(/kunde|email|bestellung/i);
  });

  it("markiert inaktive Produkte als nicht indexierbar", () => {
    const doc = buildProductSearchDocument({
      productId: "p2",
      isActive: false,
      title: "Entwurf",
      availableQuantityTotal: 0,
    });
    expect(doc.indexable).toBe(false);
    expect(doc.availabilityLabel).toBe("unavailable");
  });

  it("ändert contentHash bei Inhaltsänderung", () => {
    const a = buildProductSearchDocument({
      productId: "p3",
      isActive: true,
      title: "A",
      availableQuantityTotal: 1,
    });
    const b = buildProductSearchDocument({
      productId: "p3",
      isActive: true,
      title: "B",
      availableQuantityTotal: 1,
    });
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});
