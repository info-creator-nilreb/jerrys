import { describe, expect, it } from "vitest";
import {
  EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS,
  isManagedBlobUrl,
  resolveShopBrandingAssetUrl,
  STATIC_BRANDING_ASSET_FALLBACKS,
} from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";

describe("resolveShopBrandingAssetUrl", () => {
  const base = {
    shopName: JERRYS_SHOP_SETTINGS_DEFAULTS.shopName,
    logoLightUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.logoLightUrl,
    logoDarkUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.logoDarkUrl,
    faviconUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.faviconUrl,
    ogImageUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.ogImageUrl,
    adminLoginHeroUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.adminLoginHeroUrl,
  };

  it("fällt auf Static-Branding zurück wenn URL fehlt", () => {
    expect(resolveShopBrandingAssetUrl(base, "logoLight")).toBe(
      STATIC_BRANDING_ASSET_FALLBACKS.logoLight,
    );
    expect(resolveShopBrandingAssetUrl(base, "favicon")).toBe(
      STATIC_BRANDING_ASSET_FALLBACKS.favicon,
    );
  });

  it("nutzt Edel-weiss-Favicon wenn Shopname passt", () => {
    expect(
      resolveShopBrandingAssetUrl({ ...base, shopName: "edel weiss" }, "favicon"),
    ).toBe(EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS.favicon);
  });

  it("nutzt gespeicherte HTTPS-Blob-URL", () => {
    const url = "https://abc123.public.blob.vercel-storage.com/branding/logo-light/x.png";
    expect(
      resolveShopBrandingAssetUrl({ ...base, logoLightUrl: url }, "logoLight"),
    ).toBe(url);
  });
});

describe("isManagedBlobUrl", () => {
  it("erkennt Vercel-Blob-Hosts", () => {
    expect(
      isManagedBlobUrl("https://x.public.blob.vercel-storage.com/a.png"),
    ).toBe(true);
    expect(isManagedBlobUrl("https://memory.blob.local/branding/a.png")).toBe(true);
    expect(isManagedBlobUrl("/branding/favicon.ico")).toBe(false);
    expect(isManagedBlobUrl(null)).toBe(false);
  });
});
