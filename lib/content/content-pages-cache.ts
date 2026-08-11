import { revalidateTag, updateTag } from "next/cache";

/** Next.js Cache-Tag für ContentPages (ADR-0007). */
export const CONTENT_PAGES_CACHE_TAG = "content-pages" as const;

export function revalidateContentPagesCache(): void {
  revalidateTag(CONTENT_PAGES_CACHE_TAG, "max");
}

export function updateContentPagesCacheTag(): void {
  updateTag(CONTENT_PAGES_CACHE_TAG);
}
