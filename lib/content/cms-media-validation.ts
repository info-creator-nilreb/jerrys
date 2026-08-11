import {
  detectImageFormat,
  extForImageFormat,
  mimeForImageFormat,
  type DetectedImageFormat,
} from "@/lib/shop/branding-asset-validation";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: ReadonlySet<DetectedImageFormat> = new Set([
  "jpeg",
  "png",
  "webp",
  "svg",
]);

export type CmsMediaValidationResult =
  | {
      ok: true;
      format: DetectedImageFormat;
      contentType: string;
      ext: string;
      bytes: Buffer;
    }
  | { ok: false; error: string };

export function validateCmsMediaUpload(
  bytes: Buffer,
  declaredMime?: string | null,
): CmsMediaValidationResult {
  if (!bytes.length) {
    return { ok: false, error: "Datei ist leer." };
  }
  if (bytes.length > MAX_BYTES) {
    return { ok: false, error: "Bild darf höchstens 5 MB groß sein." };
  }
  const format = detectImageFormat(bytes);
  if (!format || !ALLOWED.has(format)) {
    return {
      ok: false,
      error: "Nur JPEG, PNG, WEBP oder SVG erlaubt.",
    };
  }
  // MIME vom Client nur als Hinweis; Magic-Bytes entscheiden.
  if (
    declaredMime &&
    !declaredMime.startsWith("image/") &&
    declaredMime !== "image/svg+xml"
  ) {
    return { ok: false, error: "Ungültiger Dateityp." };
  }
  return {
    ok: true,
    format,
    contentType: mimeForImageFormat(format),
    ext: extForImageFormat(format),
    bytes,
  };
}
