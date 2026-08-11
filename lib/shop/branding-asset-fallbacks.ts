import type { ShopBrandingAssetKind } from "@/lib/shop/branding-asset-kinds";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

/** Statische Fallbacks unter `public/branding/` (heutiges jerry’s-Branding). */
export const STATIC_BRANDING_ASSET_FALLBACKS: Record<ShopBrandingAssetKind, string> = {
  logoLight: "/branding/jerrys-wordmark.jpg",
  logoDark: "/branding/jerrys-logo-white.png",
  favicon: "/branding/favicon.ico",
  ogImage: "/branding/jerrys-wordmark.jpg",
};

export function resolveShopBrandingAssetUrl(
  settings: Pick<
    ShopSettingsDTO,
    "logoLightUrl" | "logoDarkUrl" | "faviconUrl" | "ogImageUrl"
  >,
  kind: ShopBrandingAssetKind,
): string {
  const stored =
    kind === "logoLight"
      ? settings.logoLightUrl
      : kind === "logoDark"
        ? settings.logoDarkUrl
        : kind === "favicon"
          ? settings.faviconUrl
          : settings.ogImageUrl;

  if (stored && /^https:\/\//i.test(stored)) {
    return stored;
  }
  if (stored && stored.startsWith("/")) {
    return stored;
  }
  return STATIC_BRANDING_ASSET_FALLBACKS[kind];
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
