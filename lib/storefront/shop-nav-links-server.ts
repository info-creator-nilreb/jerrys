import { cache } from "react";
import { listActiveCollectionsForStorefront } from "@/lib/catalog/collection-queries";
import { isStorefrontDatabaseDegraded } from "@/lib/db/is-database-unreachable";
import {
  buildStorefrontShopNavLinks,
  type StorefrontShopNavLink,
} from "@/lib/storefront/shop-nav-links";

/** Ein DB-Roundtrip pro Request (Header + Footer teilen sich das Ergebnis). */
export const getStorefrontShopNavLinksForLayout = cache(
  async (): Promise<StorefrontShopNavLink[]> => {
    try {
      const collections = await listActiveCollectionsForStorefront();
      return buildStorefrontShopNavLinks(collections);
    } catch (e) {
      if (isStorefrontDatabaseDegraded(e)) {
        return buildStorefrontShopNavLinks([]);
      }
      throw e;
    }
  },
);
