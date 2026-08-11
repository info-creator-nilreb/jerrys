import "server-only";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { SHOP_SETTINGS_CACHE_TAG } from "@/lib/shop/shop-settings-cache-tag";

export { SHOP_SETTINGS_CACHE_TAG };

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
