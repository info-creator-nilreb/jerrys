import { describe, expect, it } from "vitest";
import {
  EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS,
  STATIC_BRANDING_ASSET_FALLBACKS,
} from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { absoluteUrl } from "@/lib/site/canonical-origin";
import {
  buildShopMetadata,
  shopFooterTagline,
  shopThemeStyle,
} from "@/lib/shop/storefront-branding";

function settings(overrides: Partial<ShopSettingsDTO> = {}): ShopSettingsDTO {
  return {
    id: "default",
    ...JERRYS_SHOP_SETTINGS_DEFAULTS,
    updatedAt: null,
    ...overrides,
  };
}

describe("shopThemeStyle", () => {
  it("setzt CSS-Variablen aus ShopSettings", () => {
    const style = shopThemeStyle(
      settings({ primaryColor: "#112233", primaryHoverColor: "#445566" }),
    );
    expect(style).toMatchObject({
      "--primary": "#112233",
      "--primary-hover": "#445566",
    });
  });
});

describe("buildShopMetadata", () => {
  it("nutzt Shopname, Beschreibung und Asset-Fallbacks", () => {
    const meta = buildShopMetadata(
      settings({
        shopName: "Test Shop",
        shortDescription: "Kurztext für SEO.",
      }),
    );
    expect(meta.title).toEqual({
      default: "Test Shop",
      template: "%s | Test Shop",
    });
    expect(meta.description).toBe("Kurztext für SEO.");
    expect(meta.icons).toEqual({
      icon: [{ url: absoluteUrl(STATIC_BRANDING_ASSET_FALLBACKS.favicon), type: "image/x-icon" }],
      shortcut: absoluteUrl(STATIC_BRANDING_ASSET_FALLBACKS.favicon),
    });
    expect(meta.openGraph).toMatchObject({
      siteName: "Test Shop",
      description: "Kurztext für SEO.",
      images: [{ url: absoluteUrl(STATIC_BRANDING_ASSET_FALLBACKS.ogImage), alt: "Test Shop" }],
    });
  });

  it("nutzt Edel-weiss-Favicon-Fallback", () => {
    const meta = buildShopMetadata(
      settings({
        shopName: "edel weiss",
        shortDescription: "Schmuck aus Berlin.",
      }),
    );
    expect(meta.icons).toEqual({
      icon: [
        {
          url: absoluteUrl(EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS.favicon),
          type: "image/png",
        },
      ],
      shortcut: absoluteUrl(EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS.favicon),
    });
  });

  it("nutzt hochgeladene Asset-URLs", () => {
    const favicon = "https://x.public.blob.vercel-storage.com/favicon.ico";
    const og = "https://x.public.blob.vercel-storage.com/og.png";
    const meta = buildShopMetadata(
      settings({ faviconUrl: favicon, ogImageUrl: og }),
    );
    expect(meta.icons).toEqual({
      icon: [{ url: favicon, type: "image/x-icon" }],
      shortcut: favicon,
    });
    expect(meta.openGraph).toMatchObject({
      images: [{ url: og, alt: "jerry's" }],
    });
  });
});

describe("shopFooterTagline", () => {
  it("nimmt Kurzbeschreibung oder Default", () => {
    expect(shopFooterTagline(settings({ shortDescription: "Hallo." }))).toBe("Hallo.");
    expect(shopFooterTagline(settings({ shortDescription: "   " }))).toBe(
      JERRYS_SHOP_SETTINGS_DEFAULTS.shortDescription,
    );
  });
});
