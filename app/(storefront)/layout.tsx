import { CookieConsentBanner } from "@/components/storefront/cookie-consent/cookie-consent-banner";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteJsonLd } from "@/components/storefront/site-json-ld";
import { getShopSettings } from "@/lib/shop/shop-settings";
import { storefrontHeaderHeightVarsForNav } from "@/lib/storefront/page-below-header-padding";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getShopSettings();
  const headerHeightVars = storefrontHeaderHeightVarsForNav({
    desktopMode: settings.desktopShopNavMode,
    navPlacement: settings.headerNavPlacement,
  });

  return (
    <>
      <SiteJsonLd />
      <SiteHeader />
      <main className={`flex-1 ${headerHeightVars}`}>{children}</main>
      <SiteFooter />
      <CookieConsentBanner />
    </>
  );
}
