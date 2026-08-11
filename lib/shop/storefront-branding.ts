import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/** Inline-CSS-Variablen für Primärfarben (überschreibt `globals.css`-Defaults). */
export function shopThemeStyle(
  settings: Pick<ShopSettingsDTO, "primaryColor" | "primaryHoverColor">,
): CSSProperties {
  return {
    "--primary": settings.primaryColor,
    "--primary-hover": settings.primaryHoverColor,
  } as CSSProperties;
}

/**
 * Root-Metadata / Open Graph aus ShopSettings.
 * Fehlende Assets fallen auf `/branding/*` zurück.
 */
export function buildShopMetadata(settings: ShopSettingsDTO): Metadata {
  const siteOrigin = canonicalSiteOrigin();
  const shopName = settings.shopName || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName;
  const description =
    settings.shortDescription?.trim() ||
    JERRYS_SHOP_SETTINGS_DEFAULTS.shortDescription;
  const favicon = resolveShopBrandingAssetUrl(settings, "favicon");
  const ogImage = resolveShopBrandingAssetUrl(settings, "ogImage");

  return {
    ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
    title: {
      default: `${shopName} – Katzenmöbel Made in Germany`,
      template: `%s | ${shopName}`,
    },
    description,
    icons: {
      icon: favicon,
    },
    openGraph: {
      siteName: shopName,
      locale: "de_DE",
      type: "website",
      title: `${shopName} – Katzenmöbel Made in Germany`,
      description,
      images: [{ url: ogImage, alt: shopName }],
    },
  };
}

/** Footer-Tagline: Kurzbeschreibung oder jerry’s-Default. */
export function shopFooterTagline(
  settings: Pick<ShopSettingsDTO, "shortDescription">,
): string {
  const text = settings.shortDescription?.trim();
  if (text) return text;
  return JERRYS_SHOP_SETTINGS_DEFAULTS.shortDescription;
}
