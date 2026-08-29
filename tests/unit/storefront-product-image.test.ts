import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLocalProductUploadUrl,
  normalizeStorefrontProductImageUrl,
  shouldOptimizeStorefrontImage,
} from "@/lib/catalog/storefront-product-image";
import { resolveShopifyPublicOrigin } from "@/lib/catalog/shopify-public-origin";
import { isUsableStoredProductImageUrl } from "@/lib/catalog/usable-product-image-url";

describe("normalizeStorefrontProductImageUrl", () => {
  it("lehnt leere und unsichere Schemas ab", () => {
    expect(normalizeStorefrontProductImageUrl("")).toBeNull();
    expect(normalizeStorefrontProductImageUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeStorefrontProductImageUrl("ftp://cdn.shopify.com/a.jpg")).toBeNull();
  });

  it("hebt Protokoll-relative und http-URLs auf https", () => {
    expect(normalizeStorefrontProductImageUrl("//cdn.shopify.com/s/files/a.jpg")).toBe(
      "https://cdn.shopify.com/s/files/a.jpg",
    );
    expect(normalizeStorefrontProductImageUrl("http://cdn.shopify.com/s/files/a.jpg")).toBe(
      "https://cdn.shopify.com/s/files/a.jpg",
    );
  });

  it("setzt Shopify-HEIC auf format=jpg", () => {
    const out = normalizeStorefrontProductImageUrl(
      "https://cdn.shopify.com/s/files/1/FullSizeRender.heic",
    );
    expect(out).toContain("format=jpg");
    expect(out).toContain("FullSizeRender.heic");
  });

  it("ändert HEIC auf fremden Hosts nicht", () => {
    const src = "https://example.com/photo.heic";
    expect(normalizeStorefrontProductImageUrl(src)).toBe(src);
  });

  it("lässt lokale Pfade unverändert", () => {
    expect(normalizeStorefrontProductImageUrl("/media/katzenhoehle.jpg")).toBe(
      "/media/katzenhoehle.jpg",
    );
  });
});

describe("shouldOptimizeStorefrontImage", () => {
  it("optimiert Blob und lokale Dateien, nicht Shopify-CDN oder /api/", () => {
    expect(shouldOptimizeStorefrontImage("/media/a.jpg")).toBe(true);
    expect(
      shouldOptimizeStorefrontImage("https://abc.public.blob.vercel-storage.com/products/a.jpg"),
    ).toBe(true);
    expect(shouldOptimizeStorefrontImage("https://cdn.shopify.com/s/files/a.jpg")).toBe(false);
    expect(shouldOptimizeStorefrontImage("/api/storefront/instagram-media/x")).toBe(false);
  });
});

describe("isLocalProductUploadUrl", () => {
  it("erkennt nur Import-Spiegel unter /media/product-uploads/", () => {
    expect(isLocalProductUploadUrl("/media/product-uploads/foo.jpg")).toBe(true);
    expect(isLocalProductUploadUrl("/media/katzenhoehle.jpg")).toBe(false);
  });
});

describe("isUsableStoredProductImageUrl", () => {
  it("verwirft lokale Import-Uploads ohne Datei unter public/", () => {
    expect(isUsableStoredProductImageUrl("/media/product-uploads/does-not-exist.jpg")).toBe(false);
    expect(isUsableStoredProductImageUrl("https://cdn.shopify.com/s/files/a.jpg")).toBe(true);
  });
});

describe("resolveShopifyPublicOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("nimmt SHOPIFY_PUBLIC_ORIGIN wenn https", () => {
    vi.stubEnv("SHOPIFY_PUBLIC_ORIGIN", "https://edelweissdesigns.de/");
    expect(resolveShopifyPublicOrigin("jerry's")).toBe("https://edelweissdesigns.de");
  });

  it("lehnt http ab", () => {
    vi.stubEnv("SHOPIFY_PUBLIC_ORIGIN", "http://edelweissdesigns.de");
    expect(resolveShopifyPublicOrigin("Edelweiss")).toBeNull();
  });

  it("inferiert Edelweiss aus dem Shopnamen", () => {
    vi.stubEnv("SHOPIFY_PUBLIC_ORIGIN", "");
    expect(resolveShopifyPublicOrigin("Edelweiss Designs")).toBe("https://edelweissdesigns.de");
    expect(resolveShopifyPublicOrigin("Edel Weiss")).toBe("https://edelweissdesigns.de");
    expect(resolveShopifyPublicOrigin("jerry's")).toBeNull();
  });
});
