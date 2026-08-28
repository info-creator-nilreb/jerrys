import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/shop/shop-settings", () => ({
  getShopSettings: vi.fn(),
}));

vi.mock("@/lib/catalog/shopify-public-product-images", () => ({
  getShopifyPublicImageIndex: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: vi.fn(),
}));

import { getShopSettings } from "@/lib/shop/shop-settings";
import { getShopifyPublicImageIndex } from "@/lib/catalog/shopify-public-product-images";
import { getPrisma } from "@/lib/db/prisma";
import { backfillMissingProductImagesFromShopify } from "@/lib/catalog/shopify-image-backfill";

const getShopSettingsMock = vi.mocked(getShopSettings);
const getIndexMock = vi.mocked(getShopifyPublicImageIndex);
const getPrismaMock = vi.mocked(getPrisma);

describe("backfillMissingProductImagesFromShopify", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("überspringt Shops ohne Shopify-Origin", async () => {
    getShopSettingsMock.mockResolvedValue({ shopName: "jerry's" } as never);
    const result = await backfillMissingProductImagesFromShopify();
    expect(result).toEqual({ skipped: true, reason: "no_shopify_origin", scanned: 0, filled: 0 });
    expect(getPrismaMock).not.toHaveBeenCalled();
  });

  it("ersetzt unbrauchbare Bilder aus dem Shopify-Index", async () => {
    getShopSettingsMock.mockResolvedValue({ shopName: "Edelweiss" } as never);
    getIndexMock.mockResolvedValue({
      "armband-candy": [{ url: "https://cdn.shopify.com/s/files/a.jpg", alt: "Candy" }],
    });

    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const createMany = vi.fn(async () => ({ count: 1 }));
    const findMany = vi.fn(async () => [
      {
        id: "p1",
        slug: "armband-candy",
        images: [{ id: "i1", url: "/media/product-uploads/missing.jpg" }],
      },
      {
        id: "p2",
        slug: "already-ok",
        images: [{ id: "i2", url: "https://cdn.shopify.com/s/files/ok.jpg" }],
      },
    ]);

    getPrismaMock.mockReturnValue({
      product: { findMany },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ productImage: { deleteMany, createMany } }),
    } as never);

    const result = await backfillMissingProductImagesFromShopify();
    expect(result).toEqual({ skipped: false, scanned: 2, filled: 1 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(createMany).toHaveBeenCalledOnce();
  });
});
