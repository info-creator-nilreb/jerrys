import { getObjectStorage } from "@/features/integrations";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("instagram-mirror");

function extFromContentType(ct: string | null): string {
  const c = (ct ?? "").toLowerCase();
  if (c.includes("png")) return "png";
  if (c.includes("webp")) return "webp";
  if (c.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Spiegelt ein Instagram-Bild nach Object Storage (ADR-0008).
 * Bei fehlendem Blob oder Download-Fehler: Original-URL zurückgeben.
 */
export async function mirrorInstagramImageUrl(
  mediaId: string,
  sourceUrl: string,
): Promise<string> {
  const storage = getObjectStorage();
  if (!storage.isConfigured()) return sourceUrl;

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      log.warn("instagram_mirror_fetch_failed", { mediaId, status: res.status });
      return sourceUrl;
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return sourceUrl;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return sourceUrl;
    const ext = extFromContentType(contentType);
    const put = await storage.putPublic({
      pathname: `instagram/media/${mediaId}.${ext}`,
      body: bytes,
      contentType: contentType.split(";")[0]!.trim() || "image/jpeg",
      allowOverwrite: true,
    });
    return put.url;
  } catch (e) {
    log.warn("instagram_mirror_failed", { mediaId, ...errorMeta(e) });
    return sourceUrl;
  }
}
