import { randomUUID } from "node:crypto";
import {
  appendIntegrationOutbox,
  getObjectStorage,
  ObjectStorageNotConfiguredError,
} from "@/features/integrations";
import { getPrisma } from "@/lib/db/prisma";
import { createLogger, errorMeta } from "@/lib/logging/logger";
import { isManagedBlobUrl } from "@/lib/shop/branding-asset-fallbacks";
import {
  brandingAssetPathSegment,
  shopSettingsUrlFieldForAsset,
  type ShopBrandingAssetKind,
} from "@/lib/shop/branding-asset-kinds";
import { validateBrandingAssetUpload } from "@/lib/shop/branding-asset-validation";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import {
  getShopSettings,
  SHOP_SETTINGS_DEFAULT_ID,
  type ShopSettingsDTO,
} from "@/lib/shop/shop-settings";
import {
  revalidateShopSettingsCache,
  revalidateStorefrontBranding,
  updateShopSettingsCacheTag,
} from "@/lib/shop/shop-settings-cache";

function shopSettingsCreateDefaults() {
  const d = JERRYS_SHOP_SETTINGS_DEFAULTS;
  return {
    id: SHOP_SETTINGS_DEFAULT_ID,
    shopName: d.shopName,
    shortDescription: d.shortDescription,
    primaryColor: d.primaryColor,
    primaryHoverColor: d.primaryHoverColor,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    supportEmail: d.supportEmail,
    legalName: d.legalName,
    addressLine1: d.addressLine1,
    addressLine2: d.addressLine2,
    addressZip: d.addressZip,
    addressCity: d.addressCity,
    addressCountry: d.addressCountry,
    vatId: d.vatId,
    instagramUrl: d.instagramUrl,
    facebookUrl: d.facebookUrl,
    emailFromName: d.emailFromName,
    logoLightUrl: d.logoLightUrl,
    logoDarkUrl: d.logoDarkUrl,
    faviconUrl: d.faviconUrl,
    ogImageUrl: d.ogImageUrl,
    adminLoginHeroUrl: d.adminLoginHeroUrl,
  };
}

const log = createLogger("shop-branding-upload");

export type UploadShopBrandingAssetResult =
  | { ok: true; settings: ShopSettingsDTO; url: string }
  | { ok: false; error: string };

/**
 * Validiert und speichert Logo/Favicon/OG in Object Storage (ADR-0008),
 * aktualisiert den ShopSettings-Singleton. Kein Vercel-FS.
 */
export async function uploadShopBrandingAsset(input: {
  kind: ShopBrandingAssetKind;
  bytes: Buffer;
  declaredMime?: string | null;
}): Promise<UploadShopBrandingAssetResult> {
  const validated = validateBrandingAssetUpload(input.kind, input.bytes, input.declaredMime);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const storage = getObjectStorage();
  if (!storage.isConfigured()) {
    return {
      ok: false,
      error: "Object Storage ist nicht konfiguriert (BLOB_READ_WRITE_TOKEN).",
    };
  }

  const pathname = `branding/${brandingAssetPathSegment(input.kind)}/${randomUUID()}.${validated.ext}`;
  let putUrl: string;
  try {
    const put = await storage.putPublic({
      pathname,
      body: validated.bytes,
      contentType: validated.contentType,
    });
    putUrl = put.url;
  } catch (e) {
    if (e instanceof ObjectStorageNotConfiguredError) {
      return { ok: false, error: e.message };
    }
    log.error("branding_blob_put_failed", { kind: input.kind, ...errorMeta(e) });
    return { ok: false, error: "Upload in Object Storage fehlgeschlagen." };
  }

  const field = shopSettingsUrlFieldForAsset(input.kind);
  const prisma = getPrisma();

  try {
    const previous = await getShopSettings();
    const previousUrl = previous[field];

    await prisma.$transaction(async (tx) => {
      await tx.shopSettings.upsert({
        where: { id: SHOP_SETTINGS_DEFAULT_ID },
        create: { ...shopSettingsCreateDefaults(), [field]: putUrl },
        update: { [field]: putUrl },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "shop_settings",
        aggregateId: SHOP_SETTINGS_DEFAULT_ID,
        eventType: "shop_settings.branding_asset_uploaded",
        payload: {
          kind: input.kind,
          url: putUrl,
          contentType: validated.contentType,
          byteLength: validated.bytes.length,
        },
      });
    });

    if (previousUrl && previousUrl !== putUrl && isManagedBlobUrl(previousUrl)) {
      await storage.deleteByUrl(previousUrl);
    }

    updateShopSettingsCacheTag();
    revalidateShopSettingsCache();
    revalidateStorefrontBranding();
    const settings = await getShopSettings();
    return { ok: true, settings, url: putUrl };
  } catch (e) {
    log.error("branding_settings_update_failed", { kind: input.kind, ...errorMeta(e) });
    await storage.deleteByUrl(putUrl);
    return { ok: false, error: "Einstellungen konnten nicht aktualisiert werden." };
  }
}

export type ClearShopBrandingAssetResult =
  | { ok: true; settings: ShopSettingsDTO }
  | { ok: false; error: string };

/** Entfernt die gespeicherte URL (Fallback auf Static); löscht Blob best-effort. */
export async function clearShopBrandingAsset(
  kind: ShopBrandingAssetKind,
): Promise<ClearShopBrandingAssetResult> {
  const field = shopSettingsUrlFieldForAsset(kind);
  const prisma = getPrisma();
  const storage = getObjectStorage();

  try {
    const previous = await getShopSettings();
    const previousUrl = previous[field];

    await prisma.$transaction(async (tx) => {
      await tx.shopSettings.upsert({
        where: { id: SHOP_SETTINGS_DEFAULT_ID },
        create: { ...shopSettingsCreateDefaults(), [field]: null },
        update: { [field]: null },
      });
      await appendIntegrationOutbox(tx, {
        aggregateType: "shop_settings",
        aggregateId: SHOP_SETTINGS_DEFAULT_ID,
        eventType: "shop_settings.branding_asset_cleared",
        payload: { kind, previousUrl: previousUrl ?? null },
      });
    });

    if (previousUrl && isManagedBlobUrl(previousUrl)) {
      await storage.deleteByUrl(previousUrl);
    }

    updateShopSettingsCacheTag();
    revalidateShopSettingsCache();
    revalidateStorefrontBranding();
    return { ok: true, settings: await getShopSettings() };
  } catch (e) {
    log.error("branding_asset_clear_failed", { kind, ...errorMeta(e) });
    return { ok: false, error: "Asset konnte nicht entfernt werden." };
  }
}
