import "server-only";

import { revalidateTag, updateTag } from "next/cache";
import { CONTENT_PAGES_CACHE_TAG } from "@/lib/content/content-pages-cache-tag";

export { CONTENT_PAGES_CACHE_TAG };

export function revalidateContentPagesCache(): void {
  revalidateTag(CONTENT_PAGES_CACHE_TAG, "max");
}

export function updateContentPagesCacheTag(): void {
  updateTag(CONTENT_PAGES_CACHE_TAG);
}
