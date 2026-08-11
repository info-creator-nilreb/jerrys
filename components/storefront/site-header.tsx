import Image from "next/image";
import Link from "next/link";
import { HeaderAccountLink } from "@/components/storefront/header-account-link";
import { HeaderCartFlyout } from "@/components/storefront/header-cart-flyout";
import { StorefrontHeaderSearch } from "@/components/storefront/storefront-header-search";
import { StorefrontShopNav } from "@/components/storefront/storefront-shop-nav";
import { getStorefrontCartBadgeCount } from "@/lib/cart/badge";
import { listActiveCategoriesForNav } from "@/lib/catalog/category-queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { buildStorefrontShopNavLinks } from "@/lib/storefront/shop-nav-links";

/** Natürliche Logo-Größe (JPEG, Seitenverhältnis 2:1) */
const LOGO_W = 256;
const LOGO_H = 128;

export async function SiteHeader() {
  const [cartCount, settings] = await Promise.all([
    getStorefrontCartBadgeCount(),
    getShopSettings(),
  ]);
  let shopNavLinks = buildStorefrontShopNavLinks([]);
  try {
    const categories = await listActiveCategoriesForNav();
    shopNavLinks = buildStorefrontShopNavLinks(
      categories.map((c) => ({ slug: c.slug, title: c.title })),
    );
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }

  const logoSrc = resolveShopBrandingAssetUrl(settings, "logoLight");
  const shopName = settings.shopName;

  return (
    <header
      className="fixed top-0 right-0 left-0 z-[500000] border-b border-(--surface-muted) bg-white [--storefront-header-height:3.25rem] md:[--storefront-header-height:3.75rem]"
    >
      <div className="flex w-full items-center gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-3.5 lg:px-8 xl:px-10">
        <div className="flex min-w-0 flex-1 items-center">
          <StorefrontShopNav links={shopNavLinks} />
        </div>
        <Link href="/" className="shrink-0" aria-label={shopName}>
          {/* unoptimized: Branding-URLs (static/Blob) ohne veralteten Image-Optimizer-Cache */}
          <Image
            src={logoSrc}
            alt={shopName}
            width={LOGO_W}
            height={LOGO_H}
            className="h-9 w-auto sm:h-10 md:h-11"
            sizes="(max-width:768px) 180px, 220px"
            priority
            unoptimized
          />
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1">
          <StorefrontHeaderSearch />
          <HeaderAccountLink />
          <HeaderCartFlyout cartBadgeCount={cartCount} />
        </div>
      </div>
    </header>
  );
}
