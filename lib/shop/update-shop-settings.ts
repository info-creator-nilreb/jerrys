import { appendIntegrationOutbox } from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import {
  getShopSettings,
  SHOP_SETTINGS_DEFAULT_ID,
  type ShopSettingsDTO,
} from "@/lib/shop/shop-settings";
import {
  JERRYS_SHOP_SETTINGS_DEFAULTS,
  parseDesktopShopNavMode,
  parseHeaderNavPlacement,
} from "@/lib/shop/shop-settings-defaults";
import {
  parseShopSettingsUpdate,
  type ShopSettingsValues,
} from "@/lib/shop/shop-settings-schemas";
import {
  revalidateShopSettingsCache,
  revalidateStorefrontBranding,
  updateShopSettingsCacheTag,
} from "@/lib/shop/shop-settings-cache";

const log = createLogger("shop-settings-update");

export type UpdateShopSettingsResult =
  | {
      ok: true;
      settings: ShopSettingsDTO;
      contrastWarnings: string[];
    }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Record<string, string>;
    };

function fieldErrorsFromZod(err: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const p = issue.path.map(String).join(".") || "_form";
    if (!out[p]) out[p] = issue.message;
  }
  return out;
}

/** Hidden `false` + Checkbox `true`: letzter Wert gewinnt; fehlt das Feld → Default true. */
function formCheckbox(formData: FormData, key: string, defaultWhenMissing = true): boolean {
  const values = formData.getAll(key).map(String);
  if (values.length === 0) return defaultWhenMissing;
  const last = values[values.length - 1]!;
  return last === "true" || last === "on" || last === "1";
}

/** FormData → Eingabeobjekt (ohne Asset-URLs; die bleiben serverseitig erhalten). */
export function shopSettingsInputFromFormData(formData: FormData): Record<string, unknown> {
  const str = (key: string) => String(formData.get(key) ?? "");
  return {
    shopName: str("shopName"),
    shortDescription: str("shortDescription"),
    primaryColor: str("primaryColor"),
    primaryHoverColor: str("primaryHoverColor"),
    contactEmail: str("contactEmail"),
    contactPhone: str("contactPhone"),
    supportEmail: str("supportEmail"),
    legalName: str("legalName"),
    addressLine1: str("addressLine1"),
    addressLine2: str("addressLine2"),
    addressZip: str("addressZip"),
    addressCity: str("addressCity"),
    addressCountry: str("addressCountry") || "DE",
    vatId: str("vatId"),
    instagramUrl: str("instagramUrl"),
    facebookUrl: str("facebookUrl"),
    emailFromName: str("emailFromName"),
    // Assets nicht aus dem Textformular überschreiben
    logoLightUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    ogImageUrl: null,
    showAllProductsInNav: formCheckbox(formData, "showAllProductsInNav"),
    showTermineInNav: formCheckbox(formData, "showTermineInNav"),
    desktopShopNavMode: parseDesktopShopNavMode(formData.get("desktopShopNavMode")),
    headerNavPlacement: parseHeaderNavPlacement(formData.get("headerNavPlacement")),
    footerShowTagline: formCheckbox(formData, "footerShowTagline"),
    footerShowShopNav: formCheckbox(formData, "footerShowShopNav", false),
    footerShowCollections: formCheckbox(formData, "footerShowCollections"),
    footerShowCmsLinks: formCheckbox(formData, "footerShowCmsLinks"),
    footerShowSocial: formCheckbox(formData, "footerShowSocial"),
    footerShowLegalAgb: formCheckbox(formData, "footerShowLegalAgb"),
    footerShowLegalWiderruf: formCheckbox(formData, "footerShowLegalWiderruf"),
    footerShowLegalRueckgabe: formCheckbox(formData, "footerShowLegalRueckgabe", false),
    footerShowLegalVersand: formCheckbox(formData, "footerShowLegalVersand"),
  };
}

function createDefaultsRow(values: ShopSettingsValues) {
  const d = JERRYS_SHOP_SETTINGS_DEFAULTS;
  return {
    id: SHOP_SETTINGS_DEFAULT_ID,
    shopName: values.shopName,
    shortDescription: values.shortDescription ?? d.shortDescription,
    primaryColor: values.primaryColor,
    primaryHoverColor: values.primaryHoverColor,
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    supportEmail: values.supportEmail,
    legalName: values.legalName,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    addressZip: values.addressZip,
    addressCity: values.addressCity,
    addressCountry: values.addressCountry,
    vatId: values.vatId,
    instagramUrl: values.instagramUrl,
    facebookUrl: values.facebookUrl,
    emailFromName: values.emailFromName,
    logoLightUrl: d.logoLightUrl,
    logoDarkUrl: d.logoDarkUrl,
    faviconUrl: d.faviconUrl,
    ogImageUrl: d.ogImageUrl,
    showAllProductsInNav: values.showAllProductsInNav,
    showTermineInNav: values.showTermineInNav,
    desktopShopNavMode: values.desktopShopNavMode,
    headerNavPlacement: values.headerNavPlacement,
    footerShowTagline: values.footerShowTagline,
    footerShowShopNav: values.footerShowShopNav,
    footerShowCollections: values.footerShowCollections,
    footerShowCmsLinks: values.footerShowCmsLinks,
    footerShowSocial: values.footerShowSocial,
    footerShowLegalAgb: values.footerShowLegalAgb,
    footerShowLegalWiderruf: values.footerShowLegalWiderruf,
    footerShowLegalRueckgabe: values.footerShowLegalRueckgabe,
    footerShowLegalVersand: values.footerShowLegalVersand,
  };
}

/**
 * Speichert Text-/Farb-/Kontaktfelder des ShopSettings-Singletons.
 * Asset-URLs bleiben unverändert (Uploads über `uploadShopBrandingAsset`).
 */
export async function updateShopSettingsFromInput(
  rawInput: unknown,
): Promise<UpdateShopSettingsResult> {
  const parsed = parseShopSettingsUpdate(rawInput);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const values = parsed.data;
  const prisma = getPrisma();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shopSettings.upsert({
        where: { id: SHOP_SETTINGS_DEFAULT_ID },
        create: createDefaultsRow(values),
        update: {
          shopName: values.shopName,
          shortDescription: values.shortDescription,
          primaryColor: values.primaryColor,
          primaryHoverColor: values.primaryHoverColor,
          contactEmail: values.contactEmail,
          contactPhone: values.contactPhone,
          supportEmail: values.supportEmail,
          legalName: values.legalName,
          addressLine1: values.addressLine1,
          addressLine2: values.addressLine2,
          addressZip: values.addressZip,
          addressCity: values.addressCity,
          addressCountry: values.addressCountry,
          vatId: values.vatId,
          instagramUrl: values.instagramUrl,
          facebookUrl: values.facebookUrl,
          emailFromName: values.emailFromName,
          showAllProductsInNav: values.showAllProductsInNav,
          showTermineInNav: values.showTermineInNav,
          desktopShopNavMode: values.desktopShopNavMode,
          headerNavPlacement: values.headerNavPlacement,
          footerShowTagline: values.footerShowTagline,
          footerShowShopNav: values.footerShowShopNav,
          footerShowCollections: values.footerShowCollections,
          footerShowCmsLinks: values.footerShowCmsLinks,
          footerShowSocial: values.footerShowSocial,
          footerShowLegalAgb: values.footerShowLegalAgb,
          footerShowLegalWiderruf: values.footerShowLegalWiderruf,
          footerShowLegalRueckgabe: values.footerShowLegalRueckgabe,
          footerShowLegalVersand: values.footerShowLegalVersand,
        },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "shop_settings",
        aggregateId: SHOP_SETTINGS_DEFAULT_ID,
        eventType: "shop_settings.updated",
        payload: {
          shopName: values.shopName,
          primaryColor: values.primaryColor,
          primaryHoverColor: values.primaryHoverColor,
          showAllProductsInNav: values.showAllProductsInNav,
          showTermineInNav: values.showTermineInNav,
          desktopShopNavMode: values.desktopShopNavMode,
          headerNavPlacement: values.headerNavPlacement,
          footerShowShopNav: values.footerShowShopNav,
          footerShowCollections: values.footerShowCollections,
          footerShowCmsLinks: values.footerShowCmsLinks,
        },
      });
    });

    updateShopSettingsCacheTag();
    revalidateShopSettingsCache();
    revalidateStorefrontBranding();

    return {
      ok: true,
      settings: await getShopSettings(),
      contrastWarnings: parsed.contrastWarnings,
    };
  } catch (e) {
    log.error("shop_settings_update_failed", errorMeta(e));
    return { ok: false, error: "Einstellungen konnten nicht gespeichert werden." };
  }
}
