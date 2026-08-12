import { describe, expect, it, vi } from "vitest";
import { syncShipmentsOnOrderReturned } from "@/features/fulfillment";

describe("syncShipmentsOnOrderReturned", () => {
  it("markiert shipped/delivered als returned", async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      shipment: {
        findMany: vi.fn().mockResolvedValue([
          { id: "a", status: "shipped" },
          { id: "b", status: "delivered" },
        ]),
        update,
      },
    };

    const result = await syncShipmentsOnOrderReturned(prisma as never, "ord1");
    expect(result.updatedShipmentIds).toEqual(["a", "b"]);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("ändert nichts ohne passende Sendungen", async () => {
    const update = vi.fn();
    const prisma = {
      shipment: {
        findMany: vi.fn().mockResolvedValue([]),
        update,
      },
    };

    const result = await syncShipmentsOnOrderReturned(prisma as never, "ord1");
    expect(result.updatedShipmentIds).toEqual([]);
    expect(update).not.toHaveBeenCalled();
  });
});
