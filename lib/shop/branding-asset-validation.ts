import {
  brandingAssetPathSegment,
  type ShopBrandingAssetKind,
} from "@/lib/shop/branding-asset-kinds";

export type DetectedImageFormat = "jpeg" | "png" | "webp" | "ico" | "svg";

export type BrandingAssetLimits = {
  allowedMime: ReadonlySet<string>;
  maxBytes: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
};

const LOGO_LIMITS: BrandingAssetLimits = {
  allowedMime: new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]),
  maxBytes: 2 * 1024 * 1024,
  maxWidth: 4000,
  maxHeight: 4000,
};

const FAVICON_LIMITS: BrandingAssetLimits = {
  allowedMime: new Set(["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"]),
  maxBytes: 512 * 1024,
  maxWidth: 512,
  maxHeight: 512,
};

const OG_LIMITS: BrandingAssetLimits = {
  allowedMime: new Set(["image/jpeg", "image/png", "image/webp"]),
  maxBytes: 5 * 1024 * 1024,
  minWidth: 200,
  minHeight: 200,
  maxWidth: 8000,
  maxHeight: 8000,
};

export function brandingAssetLimits(kind: ShopBrandingAssetKind): BrandingAssetLimits {
  switch (kind) {
    case "logoLight":
    case "logoDark":
      return LOGO_LIMITS;
    case "favicon":
      return FAVICON_LIMITS;
    case "ogImage":
      return OG_LIMITS;
  }
}

export function extForImageFormat(format: DetectedImageFormat): string {
  switch (format) {
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "ico":
      return "ico";
    case "svg":
      return "svg";
  }
}

export function mimeForImageFormat(format: DetectedImageFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "ico":
      return "image/x-icon";
    case "svg":
      return "image/svg+xml";
  }
}

function bufferStartsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/** Erkennt Bildformat über Magic-Bytes / SVG-Text — nicht über Client-MIME. */
export function detectImageFormat(buf: Buffer): DetectedImageFormat | null {
  if (bufferStartsWith(buf, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bufferStartsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (bufferStartsWith(buf, [0x00, 0x00, 0x01, 0x00])) return "ico";

  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!DOCTYPE svg")) {
    if (/<svg[\s>]/i.test(head) || /<svg[\s>]/i.test(buf.toString("utf8", 0, Math.min(buf.length, 4096)))) {
      return "svg";
    }
  }
  return null;
}

export type ImageDimensions = { width: number; height: number };

export function readImageDimensions(
  buf: Buffer,
  format: DetectedImageFormat,
): ImageDimensions | null {
  if (format === "png" && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (format === "jpeg") {
    return readJpegDimensions(buf);
  }
  if (format === "webp") {
    return readWebpDimensions(buf);
  }
  if (format === "ico" && buf.length >= 8) {
    const w = buf[6] === 0 ? 256 : buf[6]!;
    const h = buf[7] === 0 ? 256 : buf[7]!;
    return { width: w, height: h };
  }
  // SVG: Dimensionen oft in CSS — Slice 2 überspringt Größenprüfung.
  return null;
}

function readJpegDimensions(buf: Buffer): ImageDimensions | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1]!;
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) return null;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && buf.length >= i + 9) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function readWebpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buf.length >= 30) {
    const w = 1 + buf[24]! + (buf[25]! << 8) + (buf[26]! << 16);
    const h = 1 + buf[27]! + (buf[28]! << 8) + (buf[29]! << 16);
    return { width: w, height: h };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    // Lossy bitstream: width/height in 14 bits after frame tag
    const start = 20;
    if (buf.length < start + 10) return null;
    const w = buf.readUInt16LE(start + 6) & 0x3fff;
    const h = buf.readUInt16LE(start + 8) & 0x3fff;
    return { width: w, height: h };
  }
  if (chunk === "VP8L" && buf.length >= 25) {
    const b0 = buf[21]!;
    const b1 = buf[22]!;
    const b2 = buf[23]!;
    const b3 = buf[24]!;
    const w = 1 + (((b1 & 0x3f) << 8) | b0);
    const h = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width: w, height: h };
  }
  return null;
}

export type BrandingAssetValidationOk = {
  ok: true;
  format: DetectedImageFormat;
  contentType: string;
  ext: string;
  bytes: Buffer;
  dimensions: ImageDimensions | null;
  pathnameHint: string;
};

export type BrandingAssetValidationErr = {
  ok: false;
  error: string;
};

/** Server-seitige Typ-/Größen-/Bildvalidierung vor Object-Storage-Upload. */
export function validateBrandingAssetUpload(
  kind: ShopBrandingAssetKind,
  bytes: Buffer,
  declaredMime?: string | null,
): BrandingAssetValidationOk | BrandingAssetValidationErr {
  const limits = brandingAssetLimits(kind);
  if (bytes.length === 0) {
    return { ok: false, error: "Leere Datei." };
  }
  if (bytes.length > limits.maxBytes) {
    const mb = limits.maxBytes / (1024 * 1024);
    return { ok: false, error: `Datei zu groß (max. ${mb >= 1 ? `${mb} MB` : `${limits.maxBytes / 1024} KB`}).` };
  }

  const format = detectImageFormat(bytes);
  if (!format) {
    return { ok: false, error: "Datei ist kein unterstütztes Bild (JPEG, PNG, WebP, ICO oder SVG)." };
  }

  const contentType = mimeForImageFormat(format);
  if (!limits.allowedMime.has(contentType)) {
    return { ok: false, error: `Dieses Bildformat ist für ${kind} nicht erlaubt.` };
  }

  if (declaredMime && declaredMime !== contentType) {
    // image/jpg vs image/jpeg und ICO-Aliase tolerieren
    const declared = declaredMime.toLowerCase();
    const icoAlias =
      contentType === "image/x-icon" &&
      (declared === "image/vnd.microsoft.icon" || declared === "image/x-icon");
    const jpegAlias = contentType === "image/jpeg" && declared === "image/jpg";
    if (!icoAlias && !jpegAlias && declared !== contentType) {
      return { ok: false, error: "Dateityp stimmt nicht mit dem Dateiinhalt überein." };
    }
  }

  // SVG: keine Script-/Event-Handler in Branding-Uploads
  if (format === "svg") {
    const text = bytes.toString("utf8");
    if (/<script[\s>]/i.test(text) || /\bon\w+\s*=/i.test(text) || /javascript:/i.test(text)) {
      return { ok: false, error: "SVG enthält unerlaubte Skript-Inhalte." };
    }
  }

  const dimensions = readImageDimensions(bytes, format);
  if (dimensions) {
    if (limits.minWidth && dimensions.width < limits.minWidth) {
      return { ok: false, error: `Bildbreite mindestens ${limits.minWidth}px.` };
    }
    if (limits.minHeight && dimensions.height < limits.minHeight) {
      return { ok: false, error: `Bildhöhe mindestens ${limits.minHeight}px.` };
    }
    if (limits.maxWidth && dimensions.width > limits.maxWidth) {
      return { ok: false, error: `Bildbreite maximal ${limits.maxWidth}px.` };
    }
    if (limits.maxHeight && dimensions.height > limits.maxHeight) {
      return { ok: false, error: `Bildhöhe maximal ${limits.maxHeight}px.` };
    }
  } else if (format !== "svg" && kind === "ogImage") {
    return { ok: false, error: "Bildmaße konnten nicht gelesen werden." };
  }

  const ext = extForImageFormat(format);
  return {
    ok: true,
    format,
    contentType,
    ext,
    bytes,
    dimensions,
    pathnameHint: `branding/${brandingAssetPathSegment(kind)}`,
  };
}
