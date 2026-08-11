import { describe, expect, it } from "vitest";
import {
  defaultTransactionalEmailBranding,
  transactionalEmailBrandingFromSettings,
} from "@/lib/shop/email-branding";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { wrapTransactionalEmailHtml } from "@/lib/email/transactional-email-layout";

function settings(overrides: Partial<ShopSettingsDTO> = {}): ShopSettingsDTO {
  return {
    id: "default",
    ...JERRYS_SHOP_SETTINGS_DEFAULTS,
    updatedAt: null,
    ...overrides,
  };
}

describe("transactionalEmailBrandingFromSettings", () => {
  it("übernimmt Farben, Shopname und Footer-Zeile", () => {
    const b = transactionalEmailBrandingFromSettings(
      settings({
        shopName: "Test Shop",
        primaryColor: "#112233",
        primaryHoverColor: "#445566",
        legalName: "Test GmbH",
        addressLine1: "Musterstr. 1",
        addressZip: "10115",
        addressCity: "Berlin",
        instagramUrl: "https://www.instagram.com/test/",
      }),
    );
    expect(b.shopName).toBe("Test Shop");
    expect(b.primary).toBe("#112233");
    expect(b.primaryStrong).toBe("#445566");
    expect(b.instagramUrl).toBe("https://www.instagram.com/test/");
    expect(b.footerIdentityLine).toContain("Test Shop");
    expect(b.footerIdentityLine).toContain("Test GmbH");
    expect(b.footerIdentityLine).toContain("Musterstr. 1");
  });
});

describe("wrapTransactionalEmailHtml mit Branding", () => {
  it("nutzt Settings-Farben und Shopname; ohne Logo-URL Textmarke", () => {
    const branding = {
      ...defaultTransactionalEmailBranding(),
      shopName: "Acme",
      primary: "#abcdef",
      primaryStrong: "#654321",
      logoAbsoluteUrl: null,
      footerIdentityLine: "Acme · Berlin",
      instagramUrl: null,
    };
    const html = wrapTransactionalEmailHtml({
      variant: "order",
      documentTitle: "Test",
      heading: "Hallo",
      intro: "Intro",
      bodyHtml: "<p>Body</p>",
      cta: { href: "https://example.com", label: "CTA" },
      branding,
    });
    expect(html).toContain("Acme");
    expect(html).toContain("#abcdef");
    expect(html).toContain("Acme · Berlin");
    expect(html).not.toContain("Instagram");
  });
});
