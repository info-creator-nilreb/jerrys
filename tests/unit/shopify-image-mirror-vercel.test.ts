import { afterEach, describe, expect, it, vi } from "vitest";

describe("mirrorRemoteProductImage on Vercel", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("belässt Shopify-URL wenn Blob fehlt (kein lokaler Write auf Vercel)", async () => {
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
    }));

    global.fetch = vi.fn(async () =>
      new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    ) as unknown as typeof fetch;

    const { mirrorRemoteProductImage } = await import(
      "@/features/catalog/application/mirror-remote-product-image"
    );
    const result = await mirrorRemoteProductImage(
      "https://cdn.shopify.com/s/files/1/test.jpg",
      "prod1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.keepRemoteUrl).toBe(true);
      expect(result.error).toMatch(/BLOB_READ_WRITE_TOKEN|Shopify-URL/i);
    }
  });
});
