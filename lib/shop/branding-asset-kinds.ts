export const SHOP_BRANDING_ASSET_KINDS = [
  "logoLight",
  "logoDark",
  "favicon",
  "ogImage",
] as const;

export type ShopBrandingAssetKind = (typeof SHOP_BRANDING_ASSET_KINDS)[number];

export function isShopBrandingAssetKind(value: string): value is ShopBrandingAssetKind {
  return (SHOP_BRANDING_ASSET_KINDS as readonly string[]).includes(value);
}

/** Prisma-/DTO-Feldname für die öffentliche URL. */
export function shopSettingsUrlFieldForAsset(
  kind: ShopBrandingAssetKind,
): "logoLightUrl" | "logoDarkUrl" | "faviconUrl" | "ogImageUrl" {
  switch (kind) {
    case "logoLight":
      return "logoLightUrl";
    case "logoDark":
      return "logoDarkUrl";
    case "favicon":
      return "faviconUrl";
    case "ogImage":
      return "ogImageUrl";
  }
}

/** Pathname-Segment im Blob-Store. */
export function brandingAssetPathSegment(kind: ShopBrandingAssetKind): string {
  switch (kind) {
    case "logoLight":
      return "logo-light";
    case "logoDark":
      return "logo-dark";
    case "favicon":
      return "favicon";
    case "ogImage":
      return "og-image";
  }
}
