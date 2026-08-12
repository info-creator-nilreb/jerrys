import { describe, expect, it } from "vitest";
import {
  buildPublicProductFeedDocument,
  buildPublicProductFeedItem,
  formatPublicPriceAmount,
  ifNoneMatchMatches,
  publicProductFeedEtag,
  resolvePublicAvailability,
} from "@/features/catalog/domain/public-product-feed";

describe("public product feed", () => {
  it("mappt Verfügbarkeit ohne Lagermenge", () => {
    expect(resolvePublicAvailability(3)).toBe("in_stock");
    expect(resolvePublicAvailability(0)).toBe("out_of_stock");
  });

  it("formatiert Preise wie JSON-LD (zwei Nachkommastellen)", () => {
    expect(formatPublicPriceAmount(2990)).toBe("29.90");
    expect(formatPublicPriceAmount(0)).toBe("0.00");
  });

  it("baut Feed-Eintrag mit stabiler ID und kanonischer URL", () => {
    const item = buildPublicProductFeedItem(
      {
        id: "prod_1",
        slug: "katzenhoehle",
        title: "Katzenhöhle",
        currency: "eur",
        updatedAt: new Date("2026-08-01T12:00:00.000Z"),
        priceGrossCents: 4990,
        availableQuantity: 2,
      },
      "https://shop.example",
    );

    expect(item).toEqual({
      id: "prod_1",
      slug: "katzenhoehle",
      title: "Katzenhöhle",
      url: "https://shop.example/produkte/katzenhoehle",
      price: { amountCents: 4990, amount: "49.90", currency: "EUR" },
      availability: "in_stock",
      updatedAt: "2026-08-01T12:00:00.000Z",
    });
    expect(JSON.stringify(item)).not.toMatch(/availableQuantity|stockQuantity|customer/i);
    expect(item.availability).toMatch(/^(in_stock|out_of_stock)$/);
  });

  it("ETag ist stabil bei gleichem Katalog (generatedAt ignoriert)", () => {
    const sources = [
      {
        id: "a",
        slug: "a",
        title: "A",
        currency: "EUR",
        updatedAt: "2026-08-01T00:00:00.000Z",
        priceGrossCents: 100,
        availableQuantity: 1,
      },
    ];
    const d1 = buildPublicProductFeedDocument(
      sources,
      "https://shop.example",
      new Date("2026-08-12T10:00:00Z"),
    );
    const d2 = buildPublicProductFeedDocument(
      sources,
      "https://shop.example",
      new Date("2026-08-12T11:00:00Z"),
    );
    expect(publicProductFeedEtag(d1)).toBe(publicProductFeedEtag(d2));
    expect(ifNoneMatchMatches(publicProductFeedEtag(d1), publicProductFeedEtag(d1))).toBe(
      true,
    );
    expect(ifNoneMatchMatches('W/"other"', publicProductFeedEtag(d1))).toBe(false);
  });
});
