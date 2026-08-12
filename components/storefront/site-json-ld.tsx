import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { getShopSettings } from "@/lib/shop/shop-settings";
import {
  buildOrganizationOnlineStoreJsonLd,
  buildWebSiteSearchActionJsonLd,
} from "@/lib/site/structured-data";

/**
 * Siteweite strukturierte Daten: Organization/OnlineStore + WebSite/SearchAction.
 * Branding-/Kontaktwerte aus Epic-11-ShopSettings.
 */
export async function SiteJsonLd() {
  const settings = await getShopSettings();
  return (
    <>
      <JsonLdScript data={buildOrganizationOnlineStoreJsonLd(settings)} />
      <JsonLdScript data={buildWebSiteSearchActionJsonLd(settings)} />
    </>
  );
}
