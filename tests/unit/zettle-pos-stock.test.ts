import { describe, expect, it, vi } from "vitest";
import {
  applyPosRefundStockMovements,
  applyPosSaleStockMovements,
} from "@/features/inventory/application/apply-pos-stock-movements";

function mockTx(opts?: {
  updateManyCount?: number;
}) {
  const stockMovements: unknown[] = [];
  const updates: unknown[] = [];
  return {
    stockMovements,
    updates,
    tx: {
      productVariant: {
        updateMany: vi.fn(async ({ data }: { data: unknown }) => {
          updates.push(data);
          return { count: opts?.updateManyCount ?? 1 };
        }),
        update: vi.fn(async ({ data }: { data: unknown }) => {
          updates.push(data);
          return {};
        }),
      },
      stockMovement: {
        create: vi.fn(async ({ data }: { data: unknown }) => {
          stockMovements.push(data);
          return data;
        }),
      },
    },
  };
}

describe("applyPosSaleStockMovements", () => {
  it("reduziert Bestand und schreibt pos_sale Movement", async () => {
    const { tx, stockMovements } = mockTx({ updateManyCount: 1 });
    await applyPosSaleStockMovements(tx as never, {
      lines: [{ productId: "p1", productVariantId: "v1", quantity: 2 }],
      correlationId: "zettle:abc",
    });
    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0]).toMatchObject({
      reason: "pos_sale",
      quantityDelta: -2,
      correlationId: "zettle:abc",
    });
  });

  it("wirft bei Unterbestand (kein stilles Negativ)", async () => {
    const { tx } = mockTx({ updateManyCount: 0 });
    await expect(
      applyPosSaleStockMovements(tx as never, {
        lines: [{ productId: "p1", productVariantId: "v1", quantity: 1 }],
        correlationId: "zettle:abc",
      }),
    ).rejects.toThrow(/unzureichend/i);
  });
});

describe("applyPosRefundStockMovements", () => {
  it("bucht pos_refund gut", async () => {
    const { tx, stockMovements } = mockTx();
    await applyPosRefundStockMovements(tx as never, {
      lines: [{ productId: "p1", productVariantId: "v1", quantity: 1 }],
      correlationId: "zettle:refund",
    });
    expect(stockMovements[0]).toMatchObject({
      reason: "pos_refund",
      quantityDelta: 1,
    });
  });
});
