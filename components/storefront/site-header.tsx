import { HeaderAccountLink } from "@/components/storefront/header-account-link";
import { HeaderCartLink } from "@/components/storefront/header-cart-link";
import { SiteHeaderShell } from "@/components/storefront/site-header-shell";
import { StorefrontHeaderSearch } from "@/components/storefront/storefront-header-search";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import {
  infoBannerIsVisible,
  resolveInfoBannerBgColor,
} from "@/lib/shop/info-banner";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { buildStorefrontShopNavLinks } from "@/lib/storefront/shop-nav-links";

export async function SiteHeader() {
  const [settings, categoriesResult] = await Promise.all([
    getShopSettings(),
    listActiveCategoriesForNav().catch((e) => {
      if (!isDatabaseUnreachable(e)) throw e;
      return null;
    }),
  ]);
  const navOptions = {
    showAllProducts: settings.showAllProductsInNav,
    showTermine: settings.showTermineInNav,
  };
  const shopNavLinks = buildStorefrontShopNavLinks(
    (categoriesResult ?? []).map((c) => ({ slug: c.slug, title: c.title })),
    navOptions,
  );

  const logoLightSrc = resolveShopBrandingAssetUrl(settings, "logoLight");
  const logoDarkSrc = resolveShopBrandingAssetUrl(settings, "logoDark");
  const shopName = settings.shopName;
  const showBanner = infoBannerIsVisible({
    active: settings.infoBannerActive,
    messages: settings.infoBannerMessages,
  });

  return (
    <SiteHeaderShell
      shopName={shopName}
      logoLightSrc={logoLightSrc}
      logoDarkSrc={logoDarkSrc}
      shopNavLinks={shopNavLinks}
      desktopMode={settings.desktopShopNavMode}
      navPlacement={settings.headerNavPlacement}
      infoBanner={
        showBanner
          ? {
              messages: settings.infoBannerMessages,
              durationSec: settings.infoBannerDurationSec,
              href: settings.infoBannerHref,
              bgColor: resolveInfoBannerBgColor(
                settings.infoBannerBgColor,
                settings.primaryColor,
              ),
            }
          : null
      }
      trailing={
        <>
          <StorefrontHeaderSearch />
          <HeaderAccountLink />
          <HeaderCartLink />
        </>
      }
    />
  );
}
