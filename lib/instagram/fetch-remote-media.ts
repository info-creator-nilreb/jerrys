import { isAllowedInstagramMediaUrl } from "@/lib/instagram/storefront-media-url";

export const INSTAGRAM_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 5;

export type FetchedInstagramMediaBytes = {
  bytes: Uint8Array;
  contentType: string;
};

function resolveRedirect(current: URL, location: string): string | null {
  try {
    return new URL(location, current).toString();
  } catch {
    return null;
  }
}

function normalizeImageContentType(header: string | null): string | null {
  const raw = (header ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!raw.startsWith("image/")) return null;
  if (raw === "image/jpg") return "image/jpeg";
  return raw;
}

/**
 * Lädt Bild-Bytes von einem allowlisteten Host. Kein Referer (Meta-CDN blockiert Hotlinks).
 * Redirects nur auf ebenfalls erlaubte HTTPS-Hosts.
 */
export async function fetchInstagramMediaBytes(
  sourceUrl: string,
): Promise<FetchedInstagramMediaBytes | null> {
  let current = sourceUrl;
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!isAllowedInstagramMediaUrl(current)) return null;
    const parsed = new URL(current);
    const res = await fetch(parsed.toString(), {
      redirect: "manual",
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      const next = resolveRedirect(parsed, location);
      if (!next) return null;
      current = next;
      continue;
    }

    if (!res.ok) return null;
    const contentType = normalizeImageContentType(res.headers.get("content-type"));
    if (!contentType) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.byteLength || buf.byteLength > INSTAGRAM_MEDIA_MAX_BYTES) return null;
    return { bytes: buf, contentType };
  }
  return null;
}
