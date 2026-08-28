import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/shop/shop-settings", () => ({
  getShopSettings: vi.fn(),
}));

vi.mock("@/lib/catalog/shopify-public-product-images", () => ({
  getShopifyPublicImageIndex: vi.fn(),
}));

import { getShopSettings } from "@/lib/shop/shop-settings";
import { getShopifyPublicImageIndex } from "@/lib/catalog/shopify-public-product-images";
import { attachShopifyFallbackImages } from "@/lib/catalog/attach-shopify-fallback-images";

const getShopSettingsMock = vi.mocked(getShopSettings);
const getIndexMock = vi.mocked(getShopifyPublicImageIndex);

describe("attachShopifyFallbackImages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("behält brauchbare Shopify-URLs und holt den Index nicht", async () => {
    const products = [
      {
        slug: "armband-candy",
        images: [{ url: "https://cdn.shopify.com/s/files/a.jpg", alt: "Armband" }],
      },
    ];
    const out = await attachShopifyFallbackImages(products);
    expect(out[0]?.images).toEqual(products[0]?.images);
    expect(getShopSettingsMock).not.toHaveBeenCalled();
  });

  it("entfernt fehlende lokale Uploads und setzt Shopify-Fallback per Handle", async () => {
    getShopSettingsMock.mockResolvedValue({ shopName: "Edelweiss" } as never);
    getIndexMock.mockResolvedValue({
      "armband-candy": [{ url: "https://cdn.shopify.com/s/files/fallback.jpg", alt: "Candy" }],
    });

    const out = await attachShopifyFallbackImages([
      {
        slug: "armband-candy",
        images: [{ url: "/media/product-uploads/missing.jpg", alt: "alt" }],
      },
    ]);

    expect(out[0]?.images).toEqual([
      {
        id: "shopify-fallback:armband-candy:0",
        url: "https://cdn.shopify.com/s/files/fallback.jpg",
        alt: "Candy",
        sortOrder: 0,
        isCover: true,
      },
    ]);
  });

  it("lässt jerry's ohne Shopify-Origin ohne Fallback", async () => {
    getShopSettingsMock.mockResolvedValue({ shopName: "jerry's" } as never);

    const out = await attachShopifyFallbackImages([
      {
        slug: "katzenhoehle",
        images: [{ url: "/media/product-uploads/missing.jpg", alt: "Höhle" }],
      },
    ]);

    expect(out[0]?.images).toEqual([]);
    expect(getIndexMock).not.toHaveBeenCalled();
  });
});
