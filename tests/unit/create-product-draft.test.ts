import { beforeEach, describe, expect, it, vi } from "vitest";

const productCreate = vi.fn();
const syncDefaultVariantFromProduct = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        product: { create: productCreate },
      }),
  }),
}));

vi.mock("@/features/catalog/server", () => ({
  syncDefaultVariantFromProduct: (...args: unknown[]) =>
    syncDefaultVariantFromProduct(...args),
}));

describe("createProductDraft", () => {
  beforeEach(() => {
    productCreate.mockReset();
    syncDefaultVariantFromProduct.mockReset();
    vi.resetModules();
  });

  it("legt inaktives Produkt mit Default-Variante an", async () => {
    productCreate.mockResolvedValue({ id: "prod_draft_1" });
    syncDefaultVariantFromProduct.mockResolvedValue(undefined);

    const { createProductDraft } = await import("@/lib/catalog/create-product-draft");
    const result = await createProductDraft();

    expect(result).toEqual({ id: "prod_draft_1" });
    expect(productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Neues Produkt",
          isActive: false,
        }),
      }),
    );
    expect(syncDefaultVariantFromProduct).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "prod_draft_1",
        isActive: false,
        priceGrossCents: 0,
      }),
    );
  });
});
