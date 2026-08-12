import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getObjectStorage } from "@/features/integrations";
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

/** Vercel/Lambda: nur /tmp beschreibbar — lokale public/-Writes scheitern. */
function localPublicWritesAllowed(): boolean {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return true;
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

  const filename = `${randomUUID()}.${fileExt}`;
  const storage = getObjectStorage();
  if (storage.isConfigured()) {
    try {
      const put = await storage.putPublic({
        pathname: `products/${productId}/${filename}`,
        body: buf,
        contentType,
        allowOverwrite: false,
      });
      return { ok: true, url: put.url, storage: "blob" };
    } catch (e) {
      log.warn("blob_put_failed", { productId, ...errorMeta(e) });
      // Auf Vercel kein lokaler Fallback — Remote behalten
      if (!localPublicWritesAllowed()) {
        return {
          ok: false,
          error: "Blob-Upload fehlgeschlagen — Shopify-URL belassen.",
          keepRemoteUrl: true,
        };
      }
    }
  } else if (!localPublicWritesAllowed()) {
    return {
      ok: false,
      error:
        "Kein BLOB_READ_WRITE_TOKEN — auf Vercel können Bilder nicht lokal abgelegt werden; Shopify-URL belassen.",
      keepRemoteUrl: true,
    };
  }

  if (!localPublicWritesAllowed()) {
    return {
      ok: false,
      error: "Lokales Ablegen auf dieser Plattform nicht möglich — Shopify-URL belassen.",
      keepRemoteUrl: true,
    };
  }

  try {
    const dir = path.join(process.cwd(), "public", "media", "product-uploads", productId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);
    return {
      ok: true,
      url: `/media/product-uploads/${productId}/${filename}`,
      storage: "local",
    };
  } catch (e) {
    log.warn("local_write_failed", { productId, ...errorMeta(e) });
    return {
      ok: false,
      error: "Lokales Ablegen fehlgeschlagen — Shopify-URL belassen.",
      keepRemoteUrl: true,
    };
  }
}
