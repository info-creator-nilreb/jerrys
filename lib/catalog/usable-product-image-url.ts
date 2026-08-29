import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import {
  isLocalProductUploadUrl,
  normalizeStorefrontProductImageUrl,
} from "@/lib/catalog/storefront-product-image";

function localUploadExists(url: string): boolean {
  const rel = url.trim().replace(/^\//, "");
  return existsSync(path.join(process.cwd(), "public", rel));
}

/** Lokal gespiegelte Uploads existieren auf Vercel oft nicht (ephemeres FS). */
export function isUsableStoredProductImageUrl(url: string): boolean {
  const normalized = normalizeStorefrontProductImageUrl(url);
  if (!normalized) return false;
  if (isLocalProductUploadUrl(normalized)) {
    return localUploadExists(normalized);
  }
  return true;
}
