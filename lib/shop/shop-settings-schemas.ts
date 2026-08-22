import { z } from "zod";
import { emailSchema, nonEmptyString } from "@/lib/validation/form";
import { evaluatePrimaryBrandContrast, isHexColor } from "@/lib/shop/color-contrast";
import {
  DESKTOP_SHOP_NAV_MODES,
  HEADER_NAV_PLACEMENTS,
} from "@/lib/shop/shop-settings-defaults";
import { pdpTrustSettingsSchema } from "@/lib/shop/pdp-trust-settings";

const HEX_COLOR_MSG = "Farbe als #RRGGBB angeben.";

export const hexColorSchema = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .refine(isHexColor, HEX_COLOR_MSG);

function emptyToNull(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? null : t;
}

const optionalEmail = z.preprocess(emptyToNull, emailSchema.nullable());

const optionalHttpsUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "Nur HTTPS-URLs.")
    .nullable(),
);

const optionalPhone = z.preprocess(
  emptyToNull,
  z.string().min(3).max(40).nullable(),
);

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().max(max).nullable());

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "ISO-3166-1-alpha-2 Ländercode.");

/**
 * Harte Validierung für ShopSettings (Farben, URLs, Kontakt).
 * Keine freie CSS-/JS-Eingabe. WCAG-Kontrast: siehe `parseShopSettingsUpdate` (Warnung).
 */
export const shopSettingsValuesSchema = z.object({
  shopName: nonEmptyString.max(80),
  shortDescription: optionalText(500),
  primaryColor: hexColorSchema,
  primaryHoverColor: hexColorSchema,
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  supportEmail: optionalEmail,
  legalName: optionalText(120),
  addressLine1: optionalText(120),
  addressLine2: optionalText(120),
  addressZip: optionalText(20),
  addressCity: optionalText(80),
  addressCountry: countryCodeSchema.default("DE"),
  vatId: optionalText(32),
  instagramUrl: optionalHttpsUrl,
  facebookUrl: optionalHttpsUrl,
  emailFromName: optionalText(80),
  logoLightUrl: optionalHttpsUrl,
  logoDarkUrl: optionalHttpsUrl,
  faviconUrl: optionalHttpsUrl,
  ogImageUrl: optionalHttpsUrl,
  showAllProductsInNav: z.boolean(),
  showTermineInNav: z.boolean(),
  desktopShopNavMode: z.enum(DESKTOP_SHOP_NAV_MODES),
  headerNavPlacement: z.enum(HEADER_NAV_PLACEMENTS),
  footerShowTagline: z.boolean(),
  footerShowShopNav: z.boolean(),
  footerShowCollections: z.boolean(),
  footerShowCmsLinks: z.boolean(),
  footerShowSocial: z.boolean(),
  footerShowLegalAgb: z.boolean(),
  footerShowLegalWiderruf: z.boolean(),
  footerShowLegalRueckgabe: z.boolean(),
  footerShowLegalVersand: z.boolean(),
  pdpReturnPolicyText: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s === "" ? null : s))
    .nullable(),
  pdpTrustBarItems: pdpTrustSettingsSchema.shape.pdpTrustBarItems,
});

export type ShopSettingsValues = z.infer<typeof shopSettingsValuesSchema>;

/** Alias für künftige Admin-Updates (Slice 3). */
export const shopSettingsUpdateSchema = shopSettingsValuesSchema;

/**
 * Parse inkl. WCAG-Kontrast-Warnungen (blockiert Slice-1-Defaults nicht).
 * Spätere Admin-UI kann bei `contrastWarnings.length > 0` warnen oder speichern verweigern.
 */
export function parseShopSettingsUpdate(input: unknown):
  | {
      success: true;
      data: ShopSettingsValues;
      contrastWarnings: string[];
    }
  | {
      success: false;
      error: z.ZodError;
    } {
  const result = shopSettingsValuesSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  const report = evaluatePrimaryBrandContrast(result.data.primaryColor);
  return {
    success: true,
    data: result.data,
    contrastWarnings: report?.warnings ?? [],
  };
}
