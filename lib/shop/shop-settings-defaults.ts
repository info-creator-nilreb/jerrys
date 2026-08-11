/**
 * Heutige jerry’s-Defaults für ShopSettings (Epic 11 Slice 1 / ADR-0006).
 * Quelle: `app/globals.css`, Storefront-Metadata, Impressum, E-Mail-Layout.
 */
export const SHOP_SETTINGS_DEFAULT_ID = "default" as const;

export type ShopSettingsDefaults = {
  shopName: string;
  shortDescription: string;
  primaryColor: string;
  primaryHoverColor: string;
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string | null;
  addressZip: string;
  addressCity: string;
  addressCountry: string;
  vatId: string;
  instagramUrl: string;
  facebookUrl: string | null;
  emailFromName: string;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};

export const JERRYS_SHOP_SETTINGS_DEFAULTS: ShopSettingsDefaults = {
  shopName: "jerry's",
  shortDescription:
    "Design Katzenmöbel – in Deutschland designed und gefertigt. Hohe Qualität, besonderes Design, langlebige Materialien.",
  primaryColor: "#8bbe25",
  primaryHoverColor: "#74a320",
  contactEmail: "info@jerry-s.com",
  contactPhone: "+49 (30) 78 71 80 18",
  supportEmail: "info@jerry-s.com",
  legalName: "Dr. Alexander Berlin (e.U.)",
  addressLine1: "Stargarder Str. 16",
  addressLine2: null,
  addressZip: "10437",
  addressCity: "Berlin",
  addressCountry: "DE",
  vatId: "DE276952027",
  instagramUrl: "https://www.instagram.com/jerrys.design/",
  facebookUrl: null,
  emailFromName: "jerry's",
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
};

/** Client-sichere DTO-Form (ohne next/cache / Prisma). */
export type ShopSettingsDTO = ShopSettingsDefaults & {
  id: typeof SHOP_SETTINGS_DEFAULT_ID;
  updatedAt: Date | null;
};
