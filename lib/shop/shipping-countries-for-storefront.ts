import { headers } from "next/headers";
import { labelForShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
import {
  geoCountryFromHeaders,
  resolvePreferredShippingCountry,
} from "@/lib/shop/preferred-shipping-country";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";

export type StorefrontShippingCountries = {
  countries: { code: string; label: string }[];
  /** Vorauswahl: Geo-Land (falls belieferbar), sonst DE, sonst erstes Land. */
  preferredCountry: string;
};

export async function getShippingCountriesForStorefront(): Promise<StorefrontShippingCountries> {
  const shopShip = await getShopShippingSettings();
  const countries = shopShip.shippingCountryCodes.map((code) => ({
    code,
    label: labelForShippingCountryCode(code),
  }));

  let geo: string | null = null;
  try {
    geo = geoCountryFromHeaders(await headers());
  } catch {
    geo = null;
  }

  return {
    countries,
    preferredCountry: resolvePreferredShippingCountry(
      countries.map((c) => c.code),
      geo,
    ),
  };
}
