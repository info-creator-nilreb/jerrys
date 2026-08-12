import { describe, expect, it, vi } from "vitest";
import { createReshipmentDraftForOrder } from "@/features/fulfillment";

describe("createReshipmentDraftForOrder", () => {
  it("lehnt ohne Retoure-Kontext ab", async () => {
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: "o1",
          status: "processing",
          fulfillmentStatus: "preparing",
          shipments: [{ id: "s1", status: "draft" }],
        }),
      },
      shipment: { create: vi.fn(), findFirst: vi.fn() },
    };

    const result = await createReshipmentDraftForOrder(prisma as never, "o1");
    expect(result).toMatchObject({ ok: false, error: "reship_not_applicable" });
  });

  it("legt Draft mit forceNew nach Retoure an", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "s-new",
      orderId: "o1",
      status: "draft",
    });
    const prisma = {
      order: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "o1",
            status: "retoure",
            fulfillmentStatus: "returned",
            shipments: [{ id: "s-old", status: "returned" }],
          })
          .mockResolvedValueOnce({
            id: "o1",
            status: "retoure",
            fulfillmentStatus: "returned",
            items: [{ quantity: 1, productVariantId: "v1" }],
            shipments: [],
          }),
      },
      shipment: { create },
    };

    const result = await createReshipmentDraftForOrder(prisma as never, "o1");
    expect(result).toEqual({
      ok: true,
      created: true,
      shipment: { id: "s-new", orderId: "o1", status: "draft" },
    });
    expect(create).toHaveBeenCalled();
  });
});
