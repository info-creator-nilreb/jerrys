import { describe, expect, it } from "vitest";
import {
  detectImageFormat,
  readImageDimensions,
  validateBrandingAssetUpload,
} from "@/lib/shop/branding-asset-validation";

/** Minimales PNG mit IHDR width/height (ohne gültige Pixeldaten). */
function pngWithSize(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13);
  const type = Buffer.from("IHDR");
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8; // bit depth
  data[9] = 2; // color type RGB
  const crc = Buffer.alloc(4);
  return Buffer.concat([sig, ihdrLen, type, data, crc]);
}

describe("detectImageFormat / readImageDimensions", () => {
  it("erkennt PNG und liest Maße", () => {
    const buf = pngWithSize(1200, 630);
    expect(detectImageFormat(buf)).toBe("png");
    expect(readImageDimensions(buf, "png")).toEqual({ width: 1200, height: 630 });
  });

  it("erkennt SVG", () => {
    const buf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
    expect(detectImageFormat(buf)).toBe("svg");
  });
});

describe("validateBrandingAssetUpload", () => {
  it("akzeptiert PNG-Logo", () => {
    const result = validateBrandingAssetUpload("logoLight", pngWithSize(400, 120), "image/png");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contentType).toBe("image/png");
    expect(result.pathnameHint).toBe("branding/logo-light");
  });

  it("lehnt zu große Dateien ab", () => {
    // Signatur + Padding über dem Logo-Limit (2 MB)
    const png = pngWithSize(10, 10);
    const buf = Buffer.concat([png, Buffer.alloc(3 * 1024 * 1024)]);
    const result = validateBrandingAssetUpload("logoLight", buf);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/groß/i);
  });

  it("lehnt SVG mit Script ab", () => {
    const buf = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const result = validateBrandingAssetUpload("logoLight", buf, "image/svg+xml");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Skript/i);
  });

  it("lehnt Favicon als JPEG ab", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = validateBrandingAssetUpload("favicon", jpeg, "image/jpeg");
    expect(result.ok).toBe(false);
  });

  it("fordert Mindestmaß für OG-Bilder", () => {
    const result = validateBrandingAssetUpload("ogImage", pngWithSize(100, 100));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/mindestens/i);
  });

  it("akzeptiert OG-PNG 1200×630", () => {
    const result = validateBrandingAssetUpload("ogImage", pngWithSize(1200, 630));
    expect(result.ok).toBe(true);
  });
});
