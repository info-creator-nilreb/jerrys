import { describe, expect, it } from "vitest";
import { validateCmsMediaUpload } from "@/lib/content/cms-media-validation";

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

describe("validateCmsMediaUpload", () => {
  it("akzeptiert PNG", () => {
    const result = validateCmsMediaUpload(pngWithSize(800, 600), "image/png");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ext).toBe("png");
      expect(result.contentType).toBe("image/png");
    }
  });

  it("lehnt leere Dateien ab", () => {
    const result = validateCmsMediaUpload(Buffer.alloc(0));
    expect(result).toEqual({ ok: false, error: "Datei ist leer." });
  });

  it("lehnt zu große Dateien ab", () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    big[0] = 0x89;
    big[1] = 0x50;
    big[2] = 0x4e;
    big[3] = 0x47;
    const result = validateCmsMediaUpload(big);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/5/);
    }
  });

  it("lehnt unbekannte Formate ab", () => {
    const result = validateCmsMediaUpload(Buffer.from("not-an-image"));
    expect(result.ok).toBe(false);
  });
});
