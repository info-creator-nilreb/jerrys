import "server-only";

import { unstable_cache } from "next/cache";
import { STOREFRONT_CATALOG_CACHE_TAG } from "@/lib/catalog/storefront-catalog-cache-tag";

const REVALIDATE_SECONDS = 60;

function isIncrementalCacheUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("incrementalCache missing") ||
    (error as { __NEXT_ERROR_CODE?: string }).__NEXT_ERROR_CODE === "E469"
  );
}

/** Storefront-Katalog-Cache mit Fallback für Tests/Scripts ohne Next-Request-Kontext. */
export async function runStorefrontCatalogCache<T>(
  keyParts: string[],
  loader: () => Promise<T>,
  options?: { revalidate?: number },
): Promise<T> {
  try {
    return await unstable_cache(loader, keyParts, {
      tags: [STOREFRONT_CATALOG_CACHE_TAG],
      revalidate: options?.revalidate ?? REVALIDATE_SECONDS,
    })();
  } catch (error) {
    if (isIncrementalCacheUnavailable(error)) {
      return loader();
    }
    throw error;
  }
}
