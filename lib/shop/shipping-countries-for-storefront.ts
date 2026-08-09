import { labelForShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

export async function getAllowedShippingCountriesForStorefront(): Promise<
  { code: string; label: string }[]
> {
  const shopShip = await getShopShippingSettings();
  return shopShip.shippingCountryCodes.map((code) => ({
    code,
    label: labelForShippingCountryCode(code),
  }));
}
