import { CookieConsentBanner } from "@/components/storefront/cookie-consent/cookie-consent-banner";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { storefrontHeaderHeightCssVars } from "@/lib/storefront/page-below-header-padding";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className={`flex-1 ${storefrontHeaderHeightCssVars}`}>{children}</main>
      <SiteFooter />
      <CookieConsentBanner />
    </>
  );
}
