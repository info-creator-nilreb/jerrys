/**
 * Heutige jerry’s-Defaults für ShopSettings (Epic 11 Slice 1 / ADR-0006).
 * Quelle: `app/globals.css`, Storefront-Metadata, Impressum, E-Mail-Layout.
 */
import type { InfoBannerDurationSec } from "@/lib/shop/info-banner";
import {
  DEFAULT_PDP_RETURN_POLICY_TEXT,
  DEFAULT_PDP_TRUST_BAR_ITEMS,
  type PdpTrustBarItem,
} from "@/lib/shop/pdp-trust-settings";
import { DEFAULT_PICKUP_READY_TEXT } from "@/lib/shop/pickup-settings";

export const SHOP_SETTINGS_DEFAULT_ID = "default" as const;

/** Desktop-Darstellung der Shop-Hauptnavigation. */
export const DESKTOP_SHOP_NAV_MODES = ["hidden", "inline", "burger"] as const;
export type DesktopShopNavMode = (typeof DESKTOP_SHOP_NAV_MODES)[number];

export function isDesktopShopNavMode(value: unknown): value is DesktopShopNavMode {
  return (
    value === "hidden" || value === "inline" || value === "burger"
  );
}

export function parseDesktopShopNavMode(value: unknown): DesktopShopNavMode {
  return isDesktopShopNavMode(value) ? value : "inline";
}

/** Position der sichtbaren Desktop-Linkzeile relativ zum Logo. */
export const HEADER_NAV_PLACEMENTS = ["beside", "under"] as const;
export type HeaderNavPlacement = (typeof HEADER_NAV_PLACEMENTS)[number];

export function isHeaderNavPlacement(value: unknown): value is HeaderNavPlacement {
  return value === "beside" || value === "under";
}

export function parseHeaderNavPlacement(value: unknown): HeaderNavPlacement {
  return isHeaderNavPlacement(value) ? value : "beside";
}

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
  showAllProductsInNav: boolean;
  showTermineInNav: boolean;
  desktopShopNavMode: DesktopShopNavMode;
  /** Nur bei desktopShopNavMode=inline: Linkzeile links neben oder unter dem Logo. */
  headerNavPlacement: HeaderNavPlacement;
  infoBannerActive: boolean;
  infoBannerMessages: string[];
  infoBannerDurationSec: InfoBannerDurationSec;
  infoBannerHref: string | null;
  /** null = Primärfarbe des Shops zur Laufzeit. */
  infoBannerBgColor: string | null;
  /** Storefront-Footer-Hintergrund (#RRGGBB). */
  footerBgColor: string;
  footerShowTagline: boolean;
  footerShowShopNav: boolean;
  footerShowCollections: boolean;
  footerShowCmsLinks: boolean;
  footerShowSocial: boolean;
  footerShowLegalAgb: boolean;
  footerShowLegalWiderruf: boolean;
  footerShowLegalRueckgabe: boolean;
  footerShowLegalVersand: boolean;
  /** Kaufbox PDP; null = Zeile ausblenden. */
  pdpReturnPolicyText: string | null;
  /** Grauer Trust-Banner unter der PDP (genau 3 Einträge). */
  pdpTrustBarItems: PdpTrustBarItem[];
  /** Abhol-Hinweis PDP; null = „Store in {addressCity}“. */
  pickupStoreLabel: string | null;
  pickupReadyText: string | null;
  pickupInfoUrl: string | null;
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
  showAllProductsInNav: true,
  showTermineInNav: true,
  desktopShopNavMode: "inline",
  headerNavPlacement: "beside",
  infoBannerActive: false,
  infoBannerMessages: [],
  infoBannerDurationSec: 6,
  infoBannerHref: null,
  infoBannerBgColor: null,
  footerBgColor: "#182d4d",
  // Footer: schlank by default — Shop-Nav bleibt im Header; Rückgabe oft redundant zu Widerruf.
  footerShowTagline: true,
  footerShowShopNav: false,
  footerShowCollections: true,
  footerShowCmsLinks: true,
  footerShowSocial: true,
  footerShowLegalAgb: true,
  footerShowLegalWiderruf: true,
  footerShowLegalRueckgabe: false,
  footerShowLegalVersand: true,
  pdpReturnPolicyText: DEFAULT_PDP_RETURN_POLICY_TEXT,
  pdpTrustBarItems: DEFAULT_PDP_TRUST_BAR_ITEMS.map((item) => ({ ...item })),
  pickupStoreLabel: null,
  pickupReadyText: DEFAULT_PICKUP_READY_TEXT,
  pickupInfoUrl: null,
};

/** Client-sichere DTO-Form (ohne next/cache / Prisma). */
export type ShopSettingsDTO = ShopSettingsDefaults & {
  id: typeof SHOP_SETTINGS_DEFAULT_ID;
  updatedAt: Date | null;
};
