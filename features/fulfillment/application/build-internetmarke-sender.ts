import type { ShippingLabelAddress } from "@/features/fulfillment/application/shipping-label-port";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings-defaults";

export type BuildInternetmarkeSenderResult =
  | { ok: true; sender: ShippingLabelAddress }
  | { ok: false; message: string };

/**
 * Absenderadresse für INTERNETMARKE aus ShopSettings (Impressum/Adresse).
 */
export function buildInternetmarkeSenderFromShopSettings(
  settings: ShopSettingsDTO | null | undefined,
): BuildInternetmarkeSenderResult {
  const s = settings;
  const name =
    s?.legalName?.trim() ||
    s?.shopName?.trim() ||
    JERRYS_SHOP_SETTINGS_DEFAULTS.legalName;
  const addressLine1 =
    s?.addressLine1?.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.addressLine1;
  const addressLine2 = s?.addressLine2?.trim() || null;
  const postalCode = s?.addressZip?.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.addressZip;
  const city = s?.addressCity?.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.addressCity;
  const country = s?.addressCountry?.trim() || JERRYS_SHOP_SETTINGS_DEFAULTS.addressCountry;

  if (!name || !addressLine1 || !postalCode || !city) {
    return {
      ok: false,
      message:
        "Absender unvollständig — bitte unter Einstellungen Adresse und Firmenname hinterlegen.",
    };
  }

  return {
    ok: true,
    sender: {
      name,
      additionalName: null,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      country,
    },
  };
}
