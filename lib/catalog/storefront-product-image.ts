/**
 * Storefront-Produktbilder: Blob/lokal dürfen durch next/image,
 * Remote (Shopify-CDN u. a.) nicht — Optimizer/Hotlink bricht sonst
 * einen Teil der Karten, andere (Blob) bleiben sichtbar.
 */

export function isManagedBlobImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function shouldOptimizeStorefrontImage(url: string): boolean {
  const t = url.trim();
  if (!t || t.startsWith("/api/")) return false;
  if (t.startsWith("/")) return true;
  return isManagedBlobImageUrl(t);
}

function rewriteShopifyHeicUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (!path.endsWith(".heic") && !path.endsWith(".heif")) return url;
    const host = parsed.hostname.toLowerCase();
    const shopifyHost =
      host === "cdn.shopify.com" ||
      host.endsWith(".shopify.com") ||
      host.endsWith(".myshopify.com");
    if (!shopifyHost) return url;
    parsed.searchParams.set("format", "jpg");
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Protokoll-relative URLs, http→https, HEIC über Shopify-CDN als JPEG. */
export function normalizeStorefrontProductImageUrl(url: string): string | null {
  let t = url.trim();
  if (!t) return null;
  if (t.startsWith("//")) t = `https:${t}`;
  if (t.startsWith("http://")) t = `https://${t.slice("http://".length)}`;
  if (!(t.startsWith("/") || t.startsWith("https://"))) return null;
  return rewriteShopifyHeicUrl(t);
}

export function isLocalProductUploadUrl(url: string): boolean {
  return url.trim().startsWith("/media/product-uploads/");
}
