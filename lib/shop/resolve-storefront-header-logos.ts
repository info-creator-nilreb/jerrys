import "server-only";

import { collectBlockedBlobHosts, urlHostIsBlocked } from "@/lib/catalog/blob-host-reachability";
import { isManagedBlobImageUrl } from "@/lib/catalog/storefront-product-image";
import {
  resolveShopBrandingAssetUrl,
  STATIC_BRANDING_ASSET_FALLBACKS,
} from "@/lib/shop/branding-asset-fallbacks";
import { getShopifyHeaderLogoUrl } from "@/lib/shop/shopify-header-logo";
import { resolveShopifyPublicOrigin } from "@/lib/catalog/shopify-public-origin";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

export type StorefrontHeaderLogos = {
  logoLightSrc: string;
  logoDarkSrc: string;
  /** Eine dunkle Vorlage: auf transparentem Header zu Weiß invertieren. */
  invertLogoOnTransparent: boolean;
  /** Admin-Sidebar (dunkel): Logo hell zeichnen. */
  invertLogoOnDarkUi: boolean;
};

export async function resolveStorefrontHeaderLogos(
  settings: Pick<
    ShopSettingsDTO,
    "shopName" | "logoLightUrl" | "logoDarkUrl" | "faviconUrl" | "ogImageUrl"
  >,
): Promise<StorefrontHeaderLogos> {
  const storedLight = resolveShopBrandingAssetUrl(settings, "logoLight");
  const storedDark = resolveShopBrandingAssetUrl(settings, "logoDark");
  const blocked = await collectBlockedBlobHosts([storedLight, storedDark]);
  const lightBlocked = isManagedBlobImageUrl(storedLight) && urlHostIsBlocked(storedLight, blocked);
  const darkBlocked = isManagedBlobImageUrl(storedDark) && urlHostIsBlocked(storedDark, blocked);

  if (!lightBlocked && !darkBlocked) {
    return {
      logoLightSrc: storedLight,
      logoDarkSrc: storedDark,
      invertLogoOnTransparent: false,
      invertLogoOnDarkUi: false,
    };
  }

  const origin = resolveShopifyPublicOrigin(settings.shopName);
  const shopifyLogo = origin ? await getShopifyHeaderLogoUrl(origin) : null;
  const fallbackLight = shopifyLogo ?? STATIC_BRANDING_ASSET_FALLBACKS.logoLight;
  const fallbackDark = shopifyLogo ?? STATIC_BRANDING_ASSET_FALLBACKS.logoDark;
  const usingShopify = Boolean(shopifyLogo);

  return {
    logoLightSrc: lightBlocked ? fallbackLight : storedLight,
    logoDarkSrc: darkBlocked ? fallbackDark : storedDark,
    invertLogoOnTransparent: usingShopify && darkBlocked,
    invertLogoOnDarkUi: usingShopify && darkBlocked,
  };
}
