import type { CSSProperties } from "react";
import type { Metadata } from "next";
import {
  brandingAssetMimeType,
  resolveShopBrandingAssetUrl,
} from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";
import { absoluteUrl, canonicalSiteOrigin } from "@/lib/site/canonical-origin";

/** Inline-CSS-Variablen für Primärfarben (überschreibt `globals.css`-Defaults). */
export function shopThemeStyle(
  settings: Pick<ShopSettingsDTO, "primaryColor" | "primaryHoverColor">,
): CSSProperties {
  return {
    "--primary": settings.primaryColor,
    "--primary-hover": settings.primaryHoverColor,
  } as CSSProperties;
}

function shopDefaultTitle(shopName: string): string {
  return shopName.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName;
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
  const faviconPath = resolveShopBrandingAssetUrl(settings, "favicon");
  const favicon = absoluteUrl(faviconPath);
  const faviconType = brandingAssetMimeType(faviconPath);
  const ogImage = absoluteUrl(resolveShopBrandingAssetUrl(settings, "ogImage"));
  const defaultTitle = shopDefaultTitle(shopName);

  return {
    ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
    title: {
      default: defaultTitle,
      template: `%s | ${shopName}`,
    },
    description,
    icons: {
      icon: [{ url: favicon, type: faviconType }],
      shortcut: favicon,
    },
    openGraph: {
      siteName: shopName,
      locale: "de_DE",
      type: "website",
      title: defaultTitle,
      description,
      images: [{ url: ogImage, alt: shopName }],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      images: [ogImage],
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

/** Storefront-Footer-Hintergrund (#RRGGBB). */
export function shopFooterBgColor(
  settings: Pick<ShopSettingsDTO, "footerBgColor">,
): string {
  const color = settings.footerBgColor?.trim();
  if (color) return color;
  return JERRYS_SHOP_SETTINGS_DEFAULTS.footerBgColor;
}

/**
 * Apple Pay / Google Pay Händlerlabel (ASCII, max. 64 Zeichen).
 * PayPal/Apple erwarten keinen Unicode-Apostroph — aus Shop-Namen ableiten.
 */
export function applePayStoreLabel(
  settings: Pick<ShopSettingsDTO, "shopName">,
): string {
  const raw = (settings.shopName || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName).trim();
  const ascii = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 64);
  return ascii || "Shop";
}
