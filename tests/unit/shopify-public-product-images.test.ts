import { afterEach, describe, expect, it, vi } from "vitest";
import { loadShopifyPublicImageIndex } from "@/lib/catalog/shopify-public-product-images";

describe("loadShopifyPublicImageIndex", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("indexiert Handles und normalisiert HEIC", async () => {
    global.fetch = vi.fn(async () =>
      Response.json({
        products: [
          {
            handle: "ArmBand-Candy",
            title: "Armband Candy",
            images: [
              { src: "https://cdn.shopify.com/s/files/1/FullSizeRender.heic", alt: "" },
              { src: "https://cdn.shopify.com/s/files/1/a.jpg", alt: "Front" },
            ],
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const index = await loadShopifyPublicImageIndex("https://edelweissdesigns.de/");
    expect(index["armband-candy"]).toHaveLength(2);
    expect(index["armband-candy"]?.[0]?.url).toContain("format=jpg");
    expect(index["armband-candy"]?.[1]).toEqual({
      url: "https://cdn.shopify.com/s/files/1/a.jpg",
      alt: "Front",
    });
  });

  it("liefert leeren Index bei HTTP-Fehler", async () => {
    global.fetch = vi.fn(async () => new Response("nope", { status: 503 })) as unknown as typeof fetch;
    const index = await loadShopifyPublicImageIndex("https://edelweissdesigns.de");
    expect(index).toEqual({});
  });
});
