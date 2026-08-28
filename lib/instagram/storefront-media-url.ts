/**
 * Storefront-URLs für Instagram-Cache-Zeilen.
 * Kurzlebige Meta-CDN-Links werden über den Shop-Origin proxied (kein Hotlink/Expiry im Browser).
 */

const INSTAGRAM_MEDIA_PROXY_PREFIX = "/api/storefront/instagram-media/";

/** Prisma-CUID und ähnliche IDs — kein freier Pfad. */
export function isInstagramMediaCacheId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

export function instagramMediaProxyPath(cacheId: string): string {
  return `${INSTAGRAM_MEDIA_PROXY_PREFIX}${encodeURIComponent(cacheId)}`;
}

export function isDurableStorefrontImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return host === "blob.vercel-storage.com" || host.endsWith(".blob.vercel-storage.com");
}

/**
 * Blob und lokale Pfade unverändert; Meta-CDN und sonstige Remote-URLs → Proxy.
 */
export function storefrontInstagramMediaSrc(cacheId: string, imageUrl: string): string {
  if (!isInstagramMediaCacheId(cacheId)) return imageUrl;
  if (isDurableStorefrontImageUrl(imageUrl)) return imageUrl;
  return instagramMediaProxyPath(cacheId);
}

export function isAllowedInstagramMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "cdninstagram.com" ||
    h.endsWith(".cdninstagram.com") ||
    h === "fbcdn.net" ||
    h.endsWith(".fbcdn.net") ||
    h === "fbsbx.com" ||
    h.endsWith(".fbsbx.com") ||
    h === "blob.vercel-storage.com" ||
    h.endsWith(".blob.vercel-storage.com")
  );
}

export function isAllowedInstagramMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isAllowedInstagramMediaHost(parsed.hostname);
  } catch {
    return false;
  }
}
