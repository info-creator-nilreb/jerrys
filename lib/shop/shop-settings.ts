import "server-only";

import { unstable_cache } from "next/cache";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError, isUniqueViolationError } from "@/lib/db/prisma-error";
import { ensureShopSettingsColumns } from "@/lib/shop/ensure-shop-settings-columns";
import { SHOP_SETTINGS_CACHE_TAG } from "@/lib/shop/shop-settings-cache-tag";
import {
  parseInfoBannerDurationSec,
  parseInfoBannerMessages,
} from "@/lib/shop/info-banner";
import {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  parseDesktopShopNavMode,
  parseHeaderNavPlacement,
  SHOP_SETTINGS_DEFAULT_ID,
  type ShopSettingsDTO,
} from "@/lib/shop/shop-settings-defaults";

export type { ShopSettingsDTO };

type ShopSettingsCached = Omit<ShopSettingsDTO, "updatedAt"> & {
  updatedAt: string | null;
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
    showAllProductsInNav: boolean;
    showTermineInNav: boolean;
    desktopShopNavMode: string;
    headerNavPlacement: string;
    infoBannerActive: boolean;
    infoBannerMessages: unknown;
    infoBannerDurationSec: number;
    infoBannerHref: string | null;
    infoBannerBgColor: string | null;
    footerShowTagline: boolean;
    footerShowShopNav: boolean;
    footerShowCollections: boolean;
    footerShowCmsLinks: boolean;
    footerShowSocial: boolean;
    footerShowLegalAgb: boolean;
    footerShowLegalWiderruf: boolean;
    footerShowLegalRueckgabe: boolean;
    footerShowLegalVersand: boolean;
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
    showAllProductsInNav: row.showAllProductsInNav,
    showTermineInNav: row.showTermineInNav,
    desktopShopNavMode: parseDesktopShopNavMode(row.desktopShopNavMode),
    headerNavPlacement: parseHeaderNavPlacement(row.headerNavPlacement),
    infoBannerActive: row.infoBannerActive,
    infoBannerMessages: parseInfoBannerMessages(row.infoBannerMessages),
    infoBannerDurationSec: parseInfoBannerDurationSec(row.infoBannerDurationSec),
    infoBannerHref: row.infoBannerHref ?? d.infoBannerHref,
    infoBannerBgColor: row.infoBannerBgColor ?? d.infoBannerBgColor,
    footerShowTagline: row.footerShowTagline,
    footerShowShopNav: row.footerShowShopNav,
    footerShowCollections: row.footerShowCollections,
    footerShowCmsLinks: row.footerShowCmsLinks,
    footerShowSocial: row.footerShowSocial,
    footerShowLegalAgb: row.footerShowLegalAgb,
    footerShowLegalWiderruf: row.footerShowLegalWiderruf,
    footerShowLegalRueckgabe: row.footerShowLegalRueckgabe,
    footerShowLegalVersand: row.footerShowLegalVersand,
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
  showAllProductsInNav: JERRYS_SHOP_SETTINGS_DEFAULTS.showAllProductsInNav,
  showTermineInNav: JERRYS_SHOP_SETTINGS_DEFAULTS.showTermineInNav,
  desktopShopNavMode: JERRYS_SHOP_SETTINGS_DEFAULTS.desktopShopNavMode,
  headerNavPlacement: JERRYS_SHOP_SETTINGS_DEFAULTS.headerNavPlacement,
  infoBannerActive: JERRYS_SHOP_SETTINGS_DEFAULTS.infoBannerActive,
  infoBannerMessages: JERRYS_SHOP_SETTINGS_DEFAULTS.infoBannerMessages,
  infoBannerDurationSec: JERRYS_SHOP_SETTINGS_DEFAULTS.infoBannerDurationSec,
  infoBannerHref: JERRYS_SHOP_SETTINGS_DEFAULTS.infoBannerHref,
  infoBannerBgColor: JERRYS_SHOP_SETTINGS_DEFAULTS.infoBannerBgColor,
  footerShowTagline: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowTagline,
  footerShowShopNav: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowShopNav,
  footerShowCollections: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowCollections,
  footerShowCmsLinks: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowCmsLinks,
  footerShowSocial: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowSocial,
  footerShowLegalAgb: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowLegalAgb,
  footerShowLegalWiderruf: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowLegalWiderruf,
  footerShowLegalRueckgabe: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowLegalRueckgabe,
  footerShowLegalVersand: JERRYS_SHOP_SETTINGS_DEFAULTS.footerShowLegalVersand,
});

async function loadShopSettingsFromDb(): Promise<ShopSettingsCached> {
  await ensureShopSettingsColumns();
  const prisma = getPrisma();
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
  const dto = toDto(row);
  return {
    ...dto,
    updatedAt: dto.updatedAt ? dto.updatedAt.toISOString() : null,
  };
}

const getCachedShopSettings = unstable_cache(
  loadShopSettingsFromDb,
  ["shop-settings-singleton"],
  { tags: [SHOP_SETTINGS_CACHE_TAG] },
);

function reviveShopSettings(cached: ShopSettingsCached): ShopSettingsDTO {
  return {
    ...cached,
    updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : null,
  };
}

/**
 * Liest den ShopSettings-Singleton; legt bei Bedarf die jerry’s-Default-Zeile an.
 * Cross-Request-Cache mit Tag `shop-settings` (ADR-0006); nach Admin-Save: `updateTag`.
 * Bei fehlendem Schema oder unerreichbarer DB: jerry’s-Defaults (Storefront bleibt nutzbar).
 */
export async function getShopSettings(): Promise<ShopSettingsDTO> {
  try {
    return reviveShopSettings(await getCachedShopSettings());
  } catch (e) {
    if (isMissingSchemaError(e) || isDatabaseUnreachable(e)) {
      return toDto(null);
    }
    throw e;
  }
}

export {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  SHOP_SETTINGS_DEFAULT_ID,
} from "@/lib/shop/shop-settings-defaults";
export { SHOP_SETTINGS_CACHE_TAG } from "@/lib/shop/shop-settings-cache-tag";
export {
  revalidateShopSettingsCache,
  revalidateStorefrontBranding,
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
