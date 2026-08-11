import { absoluteUrlForEmail } from "@/lib/email/email-absolute-url";
import { resolveShopBrandingAssetUrl } from "@/lib/shop/branding-asset-fallbacks";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import { getShopSettings, type ShopSettingsDTO } from "@/lib/shop/shop-settings";

/** Werte für transaktionale Mails (Layout + Signatur). */
export type TransactionalEmailBranding = {
  shopName: string;
  primary: string;
  primaryStrong: string;
  /** Absolute Logo-URL oder null → Textmarke im Layout. */
  logoAbsoluteUrl: string | null;
  instagramUrl: string | null;
  footerIdentityLine: string;
  emailFromName: string;
};

function footerIdentityFromSettings(settings: ShopSettingsDTO): string {
  const parts = [
    settings.shopName,
    settings.legalName,
    settings.addressLine1,
    [settings.addressZip, settings.addressCity].filter(Boolean).join(" "),
  ]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p && p.length > 0));
  return parts.join(" · ");
}

export function transactionalEmailBrandingFromSettings(
  settings: ShopSettingsDTO,
): TransactionalEmailBranding {
  const shopName = settings.shopName || JERRYS_SHOP_SETTINGS_DEFAULTS.shopName;
  const logoPathOrUrl = resolveShopBrandingAssetUrl(settings, "logoLight");
  return {
    shopName,
    primary: settings.primaryColor || JERRYS_SHOP_SETTINGS_DEFAULTS.primaryColor,
    primaryStrong:
      settings.primaryHoverColor || JERRYS_SHOP_SETTINGS_DEFAULTS.primaryHoverColor,
    logoAbsoluteUrl: absoluteUrlForEmail(logoPathOrUrl),
    instagramUrl: settings.instagramUrl?.trim() || null,
    footerIdentityLine: footerIdentityFromSettings(settings),
    emailFromName:
      settings.emailFromName?.trim() ||
      shopName ||
      JERRYS_SHOP_SETTINGS_DEFAULTS.emailFromName,
  };
}

/** jerry’s-Defaults ohne DB (Tests / Notfall). */
export function defaultTransactionalEmailBranding(): TransactionalEmailBranding {
  return transactionalEmailBrandingFromSettings({
    id: "default",
    ...JERRYS_SHOP_SETTINGS_DEFAULTS,
    updatedAt: null,
  });
}

/**
 * Lädt ShopSettings für Mails; bei Fehlern Defaults — Versand/Checkout nicht abbrechen.
 */
export async function resolveTransactionalEmailBranding(): Promise<TransactionalEmailBranding> {
  try {
    const settings = await getShopSettings();
    return transactionalEmailBrandingFromSettings(settings);
  } catch {
    return defaultTransactionalEmailBranding();
  }
}
