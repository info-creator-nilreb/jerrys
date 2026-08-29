import type { ShopBrandingAssetKind } from "@/lib/shop/branding-asset-kinds";
import { isEdelweissShopName } from "@/lib/shop/shop-brand-identity";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

/** Statische Fallbacks unter `public/branding/` (heutiges jerry’s-Branding). */
export const STATIC_BRANDING_ASSET_FALLBACKS: Record<ShopBrandingAssetKind, string> = {
  logoLight: "/branding/jerrys-wordmark.jpg",
  logoDark: "/branding/jerrys-logo-white.png",
  favicon: "/branding/favicon.ico",
  ogImage: "/branding/jerrys-wordmark.jpg",
  adminLoginHero: "/media/hero-mood.jpg",
};

/** Edel-weiss-Favicon aus der bisherigen Shopify-Storefront. */
export const EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS: Record<
  ShopBrandingAssetKind,
  string
> = {
  ...STATIC_BRANDING_ASSET_FALLBACKS,
  favicon: "/branding/edelweiss-favicon.png",
};

export function resolveStaticBrandingAssetFallbacks(
  shopName?: string | null,
): Record<ShopBrandingAssetKind, string> {
  return isEdelweissShopName(shopName)
    ? EDELWEISS_STATIC_BRANDING_ASSET_FALLBACKS
    : STATIC_BRANDING_ASSET_FALLBACKS;
}

export function resolveShopBrandingAssetUrl(
  settings: Pick<
    ShopSettingsDTO,
    | "shopName"
    | "logoLightUrl"
    | "logoDarkUrl"
    | "faviconUrl"
    | "ogImageUrl"
    | "adminLoginHeroUrl"
  >,
  kind: ShopBrandingAssetKind,
): string {
  const stored = (
    kind === "logoLight"
      ? settings.logoLightUrl
      : kind === "logoDark"
        ? settings.logoDarkUrl
        : kind === "favicon"
          ? settings.faviconUrl
          : kind === "ogImage"
            ? settings.ogImageUrl
            : settings.adminLoginHeroUrl
  )?.trim();

  if (stored && /^https:\/\//i.test(stored)) {
    return stored;
  }
  if (stored && stored.startsWith("/")) {
    return stored;
  }
  return resolveStaticBrandingAssetFallbacks(settings.shopName)[kind];
}

export function brandingAssetMimeType(assetPath: string): string {
  const lower = assetPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/x-icon";
}

export function isManagedBlobUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host.endsWith(".public.blob.vercel-storage.com") ||
      host === "memory.blob.local"
    );
  } catch {
    return false;
  }
}
