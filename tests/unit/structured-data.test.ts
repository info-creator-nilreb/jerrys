import { afterEach, describe, expect, it, vi } from "vitest";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { serializeJsonLd } from "@/lib/site/json-ld";
import {
  buildBreadcrumbListJsonLd,
  buildOrganizationOnlineStoreJsonLd,
  buildProductOfferJsonLd,
  buildWebSiteSearchActionJsonLd,
  organizationSchemaId,
  storefrontSearchUrlTemplate,
  websiteSchemaId,
} from "@/lib/site/structured-data";

function settings(overrides: Partial<ShopSettingsDTO> = {}): ShopSettingsDTO {
  return {
    id: "default",
    ...JERRYS_SHOP_SETTINGS_DEFAULTS,
    updatedAt: null,
    ...overrides,
  };
}

describe("serializeJsonLd", () => {
  it("escaped < gegen Script-Injection", () => {
    expect(serializeJsonLd({ name: "</script><img>" })).toContain("\\u003c/script>");
    expect(serializeJsonLd({ name: "</script><img>" })).not.toContain("</script>");
  });
});

describe("buildOrganizationOnlineStoreJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("baut Organization/OnlineStore aus ShopSettings inkl. Adresse und sameAs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    const node = buildOrganizationOnlineStoreJsonLd(settings(), "https://shop.example");

    expect(node["@type"]).toEqual(["Organization", "OnlineStore"]);
    expect(node["@id"]).toBe("https://shop.example/#organization");
    expect(node.name).toBe("jerry's");
    expect(node.legalName).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.legalName);
    expect(node.url).toBe("https://shop.example");
    expect(node.email).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.contactEmail);
    expect(node.telephone).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.contactPhone);
    expect(node.vatID).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.vatId);
    expect(node.address).toMatchObject({
      "@type": "PostalAddress",
      addressLocality: "Berlin",
      postalCode: "10437",
      addressCountry: "DE",
    });
    expect(node.sameAs).toEqual([JERRYS_SHOP_SETTINGS_DEFAULTS.instagramUrl]);
    expect(String(node.logo)).toContain("/branding/");
  });
});

describe("buildWebSiteSearchActionJsonLd", () => {
  it("verweist SearchAction auf /produkte?q={search_term_string}", () => {
    const node = buildWebSiteSearchActionJsonLd(settings(), "https://shop.example");
    expect(node["@type"]).toBe("WebSite");
    expect(node["@id"]).toBe(websiteSchemaId("https://shop.example"));
    expect(node.publisher).toEqual({
      "@id": organizationSchemaId("https://shop.example"),
    });
    expect(node.potentialAction).toMatchObject({
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: storefrontSearchUrlTemplate("https://shop.example"),
      },
      "query-input": "required name=search_term_string",
    });
    expect(storefrontSearchUrlTemplate("https://shop.example")).toBe(
      "https://shop.example/produkte?q={search_term_string}",
    );
  });
});

describe("buildBreadcrumbListJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("liefert null bei weniger als zwei Einträgen", () => {
    expect(buildBreadcrumbListJsonLd([{ label: "Start", href: "/" }])).toBeNull();
  });

  it("setzt absolute item-URLs und lässt die aktuelle Seite ohne item", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    const node = buildBreadcrumbListJsonLd([
      { href: "/", label: "Start" },
      { href: "/produkte", label: "Alle Produkte" },
      { label: "Katzenbaum" },
    ]);
    expect(node).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Start",
          item: "https://shop.example/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Alle Produkte",
          item: "https://shop.example/produkte",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Katzenbaum",
        },
      ],
    });
    expect(
      (node?.itemListElement as Array<Record<string, unknown>>)[2],
    ).not.toHaveProperty("item");
  });
});

describe("buildProductOfferJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("baut Product/Offer und verlinkt Brand auf Organization", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    const node = buildProductOfferJsonLd({
      name: "Kratzbaum",
      description: "Hochwertig",
      slug: "kratzbaum",
      priceGrossCents: 19900,
      currency: "EUR",
      availableQuantity: 3,
      images: [{ url: "/media/a.jpg", alt: "A" }],
    });

    expect(node["@type"]).toBe("Product");
    expect(node.brand).toEqual({ "@id": "https://shop.example/#organization" });
    expect(node.offers).toMatchObject({
      "@type": "Offer",
      price: "199.00",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: "https://shop.example/produkte/kratzbaum",
    });
  });

  it("setzt OutOfStock und AggregateRating wenn vorhanden", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example");
    const node = buildProductOfferJsonLd({
      name: "X",
      description: null,
      slug: "x",
      priceGrossCents: 100,
      currency: "EUR",
      availableQuantity: 0,
      images: [],
      aggregateRatingAverage: 4.5,
      aggregateRatingCount: 12,
    });
    expect(node.offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
    });
    expect(node.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 12,
    });
  });
});
