import { describe, expect, it, vi } from "vitest";
import { markShipmentReturned } from "@/features/fulfillment";

describe("markShipmentReturned", () => {
  it("setzt shipped → returned", async () => {
    const update = vi.fn().mockResolvedValue({ id: "s1" });
    const prisma = {
      shipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "s1",
          orderId: "o1",
          status: "shipped",
        }),
        update,
      },
    };

    const result = await markShipmentReturned(prisma as never, "s1");
    expect(result).toEqual({
      ok: true,
      shipmentId: "s1",
      orderId: "o1",
      alreadyReturned: false,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: { status: "returned" },
      }),
    );
  });

  it("ist idempotent bei already returned", async () => {
    const update = vi.fn();
    const prisma = {
      shipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "s1",
          orderId: "o1",
          status: "returned",
        }),
        update,
      },
    };

    const result = await markShipmentReturned(prisma as never, "s1");
    expect(result).toMatchObject({ ok: true, alreadyReturned: true });
    expect(update).not.toHaveBeenCalled();
  });

  it("lehnt draft ab", async () => {
    const prisma = {
      shipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "s1",
          orderId: "o1",
          status: "draft",
        }),
        update: vi.fn(),
      },
    };

    const result = await markShipmentReturned(prisma as never, "s1");
    expect(result).toMatchObject({ ok: false, error: "invalid_status" });
  });
});
