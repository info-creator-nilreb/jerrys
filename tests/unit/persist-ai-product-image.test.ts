import { describe, expect, it, vi, beforeEach } from "vitest";

const putPublic = vi.fn();
const isConfigured = vi.fn(() => true);
const moderate = vi.fn();
const findUnique = vi.fn();
const aggregate = vi.fn();
const count = vi.fn();
const create = vi.fn();

vi.mock("@/features/integrations", () => ({
  getObjectStorage: () => ({
    isConfigured,
    putPublic,
  }),
  createAiContentPort: async () => ({
    isConfigured: () => true,
    supports: (c: string) => c === "moderation",
    moderate,
  }),
  ObjectStorageNotConfiguredError: class extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "ObjectStorageNotConfiguredError";
    }
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    product: { findUnique },
    productImage: { aggregate, count, create },
  }),
}));

import { persistAiGeneratedProductImage } from "@/features/catalog/application/persist-ai-product-image";

/** Minimal gültiges 1x1 PNG */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("persistAiGeneratedProductImage", () => {
  beforeEach(() => {
    putPublic.mockReset();
    isConfigured.mockReset();
    isConfigured.mockReturnValue(true);
    moderate.mockReset();
    moderate.mockResolvedValue({ ok: true, flagged: false, categories: [], meta: {} });
    findUnique.mockReset();
    aggregate.mockReset();
    count.mockReset();
    create.mockReset();
  });

  it("lehnt fehlenden Alt-Text ab", async () => {
    const result = await persistAiGeneratedProductImage({
      productId: "p1",
      temporaryImageBase64: PNG_1X1.toString("base64"),
      alt: "  ",
    });
    expect(result).toMatchObject({ ok: false });
  });

  it("speichert nach Moderation in Blob und legt ProductImage an", async () => {
    findUnique.mockResolvedValue({ id: "p1", slug: "kerze", title: "Kerze" });
    aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
    count.mockResolvedValue(1);
    putPublic.mockResolvedValue({
      url: "https://blob.example/products/p1/x.png",
      pathname: "products/p1/x.png",
      contentType: "image/png",
    });
    create.mockResolvedValue({ id: "img1" });

    const result = await persistAiGeneratedProductImage({
      productId: "p1",
      temporaryImageBase64: PNG_1X1.toString("base64"),
      alt: "Duftkerze auf Tisch",
    });

    expect(result).toMatchObject({
      ok: true,
      imageId: "img1",
      url: "https://blob.example/products/p1/x.png",
    });
    expect(putPublic).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "p1",
          alt: "Duftkerze auf Tisch",
          isCover: false,
        }),
      }),
    );
  });

  it("blockiert bei Moderation flagged", async () => {
    findUnique.mockResolvedValue({ id: "p1", slug: "kerze", title: "Kerze" });
    moderate.mockResolvedValue({
      ok: true,
      flagged: true,
      categories: ["violence"],
      meta: {},
    });

    const result = await persistAiGeneratedProductImage({
      productId: "p1",
      temporaryImageBase64: PNG_1X1.toString("base64"),
      alt: "Test",
    });

    expect(result).toMatchObject({ ok: false, code: "moderation_blocked" });
    expect(putPublic).not.toHaveBeenCalled();
  });
});
