import "server-only";

import { revalidateTag, updateTag } from "next/cache";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";

export { STOREFRONT_CATALOG_CACHE_TAG };

/** Stale-while-revalidate nach Katalogänderungen. */
export function revalidateStorefrontCatalogCache(): void {
  revalidateTag(STOREFRONT_CATALOG_CACHE_TAG, "max");
}

/** Read-your-own-writes nach Admin-Speichern (Server Actions). */
export function updateStorefrontCatalogCacheTag(): void {
  updateTag(STOREFRONT_CATALOG_CACHE_TAG);
}
