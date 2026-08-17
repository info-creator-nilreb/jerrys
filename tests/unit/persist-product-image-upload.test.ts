import { afterEach, describe, expect, it, vi } from "vitest";

describe("persistProductImageUpload", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("verlangt BLOB_READ_WRITE_TOKEN auf Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();

    vi.doMock("@/features/integrations", () => ({
      getObjectStorage: () => ({
        isConfigured: () => false,
        putPublic: async () => {
          throw new Error("not configured");
        },
        deleteByUrl: async () => {},
      }),
      ObjectStorageNotConfiguredError: class extends Error {},
    }));

    const { persistProductImageUpload } = await import(
      "@/features/catalog/application/persist-product-image-upload"
    );
    const result = await persistProductImageUpload({
      productId: "prod1",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      contentType: "image/jpeg",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/BLOB_READ_WRITE_TOKEN/);
    }
  });

  it("speichert in Blob wenn konfiguriert", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.resetModules();

    vi.doMock("@/features/integrations", () => ({
      getObjectStorage: () => ({
        isConfigured: () => true,
        putPublic: async () => ({
          url: "https://x.public.blob.vercel-storage.com/products/prod1/a.jpg",
          pathname: "products/prod1/a.jpg",
          contentType: "image/jpeg",
        }),
        deleteByUrl: async () => {},
      }),
      ObjectStorageNotConfiguredError: class extends Error {},
    }));

    const { persistProductImageUpload } = await import(
      "@/features/catalog/application/persist-product-image-upload"
    );
    const result = await persistProductImageUpload({
      productId: "prod1",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      contentType: "image/jpeg",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://x.public.blob.vercel-storage.com/products/prod1/a.jpg",
      storage: "blob",
    });
  });
});
