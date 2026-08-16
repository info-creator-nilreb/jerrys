import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildStorefrontMetadata,
  catalogListingHasNonIndexParams,
  CATALOG_LISTING_NOINDEX_ROBOTS,
} from "@/lib/site/storefront-metadata";

describe("buildStorefrontMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("setzt canonical, OG product type und Twitter parallel", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.test");
    const meta = buildStorefrontMetadata({
      title: "Kratzbaum",
      description: "Hochwertig",
      path: "/produkte/kratzbaum",
      openGraphType: "product",
      images: [{ url: "/media/a.jpg", alt: "Kratzbaum" }],
    });

    expect(meta.title).toBe("Kratzbaum");
    expect(meta.alternates).toEqual({ canonical: "/produkte/kratzbaum" });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      url: "https://shop.test/produkte/kratzbaum",
    });
    expect(meta.other).toEqual({ "og:type": "product" });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Kratzbaum",
    });
  });
});

describe("catalogListingHasNonIndexParams", () => {
  it("erkennt Suche und Filter", () => {
    expect(catalogListingHasNonIndexParams({ q: "napf" })).toBe(true);
    expect(catalogListingHasNonIndexParams({ sort: "price_asc" })).toBe(true);
    expect(catalogListingHasNonIndexParams({ verfuegbar: "1" })).toBe(true);
    expect(catalogListingHasNonIndexParams({})).toBe(false);
    expect(catalogListingHasNonIndexParams({ sort: "default" })).toBe(false);
  });

  it("liefert noindex robots preset", () => {
    expect(CATALOG_LISTING_NOINDEX_ROBOTS).toEqual({ index: false, follow: true });
  });
});
