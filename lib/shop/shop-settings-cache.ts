import { revalidatePath, revalidateTag, updateTag } from "next/cache";

/**
 * Next.js Cache-Tag für ShopSettings (ADR-0006).
 * Storefront/E-Mail/PDF (Slice 4+) taggen damit; Admin-Save invalidiert.
 */
export const SHOP_SETTINGS_CACHE_TAG = "shop-settings" as const;

/** Stale-while-revalidate für breitere Oberflächen nach Branding-Änderung. */
export function revalidateShopSettingsCache(): void {
  revalidateTag(SHOP_SETTINGS_CACHE_TAG, "max");
}

/** Read-your-own-writes nach Admin-Speichern (nur Server Actions). */
export function updateShopSettingsCacheTag(): void {
  updateTag(SHOP_SETTINGS_CACHE_TAG);
}

/** Storefront Root-Layout (CSS-Vars, Metadata, Header/Footer) nach Branding-Änderung. */
export function revalidateStorefrontBranding(): void {
  revalidatePath("/", "layout");
}
