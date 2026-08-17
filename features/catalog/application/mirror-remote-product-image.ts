import { persistProductImageUpload } from "@/features/catalog/application/persist-product-image-upload";
import { ALLOWED_IMAGE_TYPES, extFromMime, MAX_UPLOAD_BYTES } from "@/lib/admin/upload-image";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("catalog.shopify-image-mirror");

function guessMimeFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith(".heic") || pathname.endsWith(".heif")) return "image/heic";
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".webp")) return "image/webp";
  } catch {
    /* ignore */
  }
  return null;
}

export type MirrorRemoteImageResult =
  | { ok: true; url: string; storage: "blob" | "local" }
  | { ok: false; error: string; keepRemoteUrl?: boolean };

/**
 * Lädt ein Remote-Bild (Shopify-CDN) und legt es in Blob ab (bevorzugt).
 * Lokaler Fallback nur außerhalb von Vercel. Wirft nie — bei Fehler Remote behalten.
 */
export async function mirrorRemoteProductImage(
  remoteUrl: string,
  productId: string,
): Promise<MirrorRemoteImageResult> {
  const urlGuess = guessMimeFromUrl(remoteUrl);
  if (urlGuess === "image/heic") {
    return {
      ok: false,
      error: "HEIC wird nicht unterstützt — Remote-URL belassen oder manuell ersetzen.",
      keepRemoteUrl: true,
    };
  }

  let res: Response;
  try {
    res = await fetch(remoteUrl, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    log.warn("image_fetch_failed", { remoteUrl, ...errorMeta(e) });
    return { ok: false, error: "Download fehlgeschlagen.", keepRemoteUrl: true };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: `HTTP ${res.status} beim Bild-Download.`,
      keepRemoteUrl: true,
    };
  }

  const contentTypeRaw = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  let contentType = contentTypeRaw;
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    const fromUrl = guessMimeFromUrl(remoteUrl);
    if (fromUrl && ALLOWED_IMAGE_TYPES.has(fromUrl)) contentType = fromUrl;
    else if (contentType === "image/heic" || contentType === "image/heif") {
      return {
        ok: false,
        error: "HEIC wird nicht unterstützt.",
        keepRemoteUrl: true,
      };
    } else {
      return {
        ok: false,
        error: `Nicht unterstützter Bildtyp (${contentType || "unbekannt"}).`,
        keepRemoteUrl: true,
      };
    }
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    log.warn("image_buffer_failed", { remoteUrl, ...errorMeta(e) });
    return { ok: false, error: "Bild konnte nicht gelesen werden.", keepRemoteUrl: true };
  }

  if (buf.byteLength === 0) {
    return { ok: false, error: "Leeres Bild.", keepRemoteUrl: true };
  }
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Bild zu groß (max. ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB).`,
      keepRemoteUrl: true,
    };
  }

  const fileExt = extFromMime(contentType);
  if (!fileExt) {
    return { ok: false, error: "Ungültiger Bildtyp.", keepRemoteUrl: true };
  }

  const stored = await persistProductImageUpload({
    productId,
    bytes: buf,
    contentType,
  });
  if (stored.ok) {
    return { ok: true, url: stored.url, storage: stored.storage };
  }

  log.warn("product_image_persist_failed", { productId, error: stored.error });
  return {
    ok: false,
    error: stored.error.includes("BLOB_READ_WRITE_TOKEN")
      ? "Kein BLOB_READ_WRITE_TOKEN — auf Vercel können Bilder nicht lokal abgelegt werden; Shopify-URL belassen."
      : `${stored.error} — Shopify-URL belassen.`,
    keepRemoteUrl: true,
  };
}
