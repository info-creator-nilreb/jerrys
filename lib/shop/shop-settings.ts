import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError, isUniqueViolationError } from "@/lib/db/prisma-error";
import {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  SHOP_SETTINGS_DEFAULT_ID,
  type ShopSettingsDefaults,
} from "@/lib/shop/shop-settings-defaults";

export type ShopSettingsDTO = ShopSettingsDefaults & {
  id: typeof SHOP_SETTINGS_DEFAULT_ID;
  updatedAt: Date | null;
};

function toDto(
  row: {
    shopName: string;
    shortDescription: string | null;
    primaryColor: string;
    primaryHoverColor: string;
    contactEmail: string | null;
    contactPhone: string | null;
    supportEmail: string | null;
    legalName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressZip: string | null;
    addressCity: string | null;
    addressCountry: string;
    vatId: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    emailFromName: string | null;
    logoLightUrl: string | null;
    logoDarkUrl: string | null;
    faviconUrl: string | null;
    ogImageUrl: string | null;
    updatedAt: Date;
  } | null,
): ShopSettingsDTO {
  const d = JERRYS_SHOP_SETTINGS_DEFAULTS;
  if (!row) {
    return { id: SHOP_SETTINGS_DEFAULT_ID, ...d, updatedAt: null };
  }
  return {
    id: SHOP_SETTINGS_DEFAULT_ID,
    shopName: row.shopName || d.shopName,
    shortDescription: row.shortDescription ?? d.shortDescription,
    primaryColor: row.primaryColor || d.primaryColor,
    primaryHoverColor: row.primaryHoverColor || d.primaryHoverColor,
    contactEmail: row.contactEmail ?? d.contactEmail,
    contactPhone: row.contactPhone ?? d.contactPhone,
    supportEmail: row.supportEmail ?? d.supportEmail,
    legalName: row.legalName ?? d.legalName,
    addressLine1: row.addressLine1 ?? d.addressLine1,
    addressLine2: row.addressLine2 ?? d.addressLine2,
    addressZip: row.addressZip ?? d.addressZip,
    addressCity: row.addressCity ?? d.addressCity,
    addressCountry: row.addressCountry || d.addressCountry,
    vatId: row.vatId ?? d.vatId,
    instagramUrl: row.instagramUrl ?? d.instagramUrl,
    facebookUrl: row.facebookUrl ?? d.facebookUrl,
    emailFromName: row.emailFromName ?? d.emailFromName,
    logoLightUrl: row.logoLightUrl,
    logoDarkUrl: row.logoDarkUrl,
    faviconUrl: row.faviconUrl,
    ogImageUrl: row.ogImageUrl,
    updatedAt: row.updatedAt,
  };
}

const createDefaults = () => ({
  id: SHOP_SETTINGS_DEFAULT_ID,
  shopName: JERRYS_SHOP_SETTINGS_DEFAULTS.shopName,
  shortDescription: JERRYS_SHOP_SETTINGS_DEFAULTS.shortDescription,
  primaryColor: JERRYS_SHOP_SETTINGS_DEFAULTS.primaryColor,
  primaryHoverColor: JERRYS_SHOP_SETTINGS_DEFAULTS.primaryHoverColor,
  contactEmail: JERRYS_SHOP_SETTINGS_DEFAULTS.contactEmail,
  contactPhone: JERRYS_SHOP_SETTINGS_DEFAULTS.contactPhone,
  supportEmail: JERRYS_SHOP_SETTINGS_DEFAULTS.supportEmail,
  legalName: JERRYS_SHOP_SETTINGS_DEFAULTS.legalName,
  addressLine1: JERRYS_SHOP_SETTINGS_DEFAULTS.addressLine1,
  addressLine2: JERRYS_SHOP_SETTINGS_DEFAULTS.addressLine2,
  addressZip: JERRYS_SHOP_SETTINGS_DEFAULTS.addressZip,
  addressCity: JERRYS_SHOP_SETTINGS_DEFAULTS.addressCity,
  addressCountry: JERRYS_SHOP_SETTINGS_DEFAULTS.addressCountry,
  vatId: JERRYS_SHOP_SETTINGS_DEFAULTS.vatId,
  instagramUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.instagramUrl,
  facebookUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.facebookUrl,
  emailFromName: JERRYS_SHOP_SETTINGS_DEFAULTS.emailFromName,
  logoLightUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.logoLightUrl,
  logoDarkUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.logoDarkUrl,
  faviconUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.faviconUrl,
  ogImageUrl: JERRYS_SHOP_SETTINGS_DEFAULTS.ogImageUrl,
});

/**
 * Liest den ShopSettings-Singleton; legt bei Bedarf die jerry’s-Default-Zeile an.
 * Kein Admin-UI in Slice 1 — nur Lese-/Seed-Pfad.
 */
export async function getShopSettings(): Promise<ShopSettingsDTO> {
  const prisma = getPrisma();
  try {
    let row = await prisma.shopSettings.findUnique({
      where: { id: SHOP_SETTINGS_DEFAULT_ID },
    });
    if (!row) {
      try {
        row = await prisma.shopSettings.create({ data: createDefaults() });
      } catch (e) {
        if (isUniqueViolationError(e)) {
          row = await prisma.shopSettings.findUnique({
            where: { id: SHOP_SETTINGS_DEFAULT_ID },
          });
        } else {
          throw e;
        }
      }
    }
    return toDto(row);
  } catch (e) {
    if (isMissingSchemaError(e)) {
      return toDto(null);
    }
    throw e;
  }
}

export {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  SHOP_SETTINGS_DEFAULT_ID,
} from "@/lib/shop/shop-settings-defaults";
export {
  SHOP_SETTINGS_CACHE_TAG,
  revalidateShopSettingsCache,
  updateShopSettingsCacheTag,
} from "@/lib/shop/shop-settings-cache";
export {
  hexColorSchema,
  parseShopSettingsUpdate,
  shopSettingsUpdateSchema,
  shopSettingsValuesSchema,
  type ShopSettingsValues,
} from "@/lib/shop/shop-settings-schemas";
export {
  contrastRatio,
  evaluatePrimaryBrandContrast,
  isHexColor,
  relativeLuminance,
} from "@/lib/shop/color-contrast";
