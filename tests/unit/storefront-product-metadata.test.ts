import { describe, expect, it } from "vitest";
import {
  metadataForProduct,
  productOfferJsonLdInputFromProduct,
} from "@/lib/catalog/storefront-product-metadata";

const source = {
  slug: "kratzbaum",
  title: "Kratzbaum X",
  subtitle: "Untertitel",
  description: "<p>HTML Beschreibung</p>",
  leadText: "Kurztext",
  currency: "EUR",
  images: [{ url: "/media/a.jpg", alt: "A" }],
  defaultVariant: {
    sku: "SKU-1",
    priceGrossCents: 9900,
    availableQuantity: 2,
  },
  amazonRatingAverage: null,
  amazonRatingCount: null,
};

describe("storefront-product-metadata", () => {
  it("nutzt leadText für Description und JSON-LD", () => {
    const meta = metadataForProduct(source);
    expect(meta.description).toBe("Kurztext");
    expect(meta.other).toEqual({ "og:type": "product" });

    const jsonLd = productOfferJsonLdInputFromProduct(source);
    expect(jsonLd.description).toBe("Kurztext");
    expect(jsonLd.sku).toBe("SKU-1");
    expect(jsonLd.priceGrossCents).toBe(9900);
  });
});
