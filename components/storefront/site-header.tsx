import { HeaderAccountLink } from "@/components/storefront/header-account-link";
import { HeaderCartLink } from "@/components/storefront/header-cart-link";
import { SiteHeaderShell } from "@/components/storefront/site-header-shell";
import { StorefrontHeaderSearch } from "@/components/storefront/storefront-header-search";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
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

  return (
    <SiteHeaderShell
      shopName={shopName}
      logoLightSrc={logoLightSrc}
      logoDarkSrc={logoDarkSrc}
      shopNavLinks={shopNavLinks}
      desktopMode={settings.desktopShopNavMode}
      navPlacement={settings.headerNavPlacement}
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
