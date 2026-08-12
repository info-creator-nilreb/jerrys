import { describe, expect, it, vi } from "vitest";
import { syncManualShipmentOnOrderShipped } from "@/features/fulfillment";

describe("syncManualShipmentOnOrderShipped", () => {
  it("legt eine Shipment-Zeile an, wenn keine offene existiert", async () => {
    const create = vi.fn().mockResolvedValue({ id: "ship-new" });
    const prisma = {
      shipment: {
        findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        create,
        update: vi.fn(),
      },
    };

    const result = await syncManualShipmentOnOrderShipped(prisma as never, {
      orderId: "ord1",
      carrier: "DHL",
      trackingNumber: "TRACK1234",
    });

    expect(result).toEqual({ shipmentId: "ship-new", created: true, updated: false });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "ord1",
          status: "shipped",
          carrier: "DHL",
          trackingNumber: "TRACK1234",
          labelProvider: "none",
        }),
      }),
    );
  });

  it("aktualisiert offenen Draft auf shipped", async () => {
    const update = vi.fn().mockResolvedValue({ id: "ship-draft" });
    const prisma = {
      shipment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "ship-draft",
          status: "draft",
          trackingNumber: null,
          carrier: null,
        }),
        create: vi.fn(),
        update,
      },
    };

    const result = await syncManualShipmentOnOrderShipped(prisma as never, {
      orderId: "ord1",
      carrier: "DPD",
      trackingNumber: "DPD999",
    });

    expect(result).toEqual({ shipmentId: "ship-draft", created: false, updated: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ship-draft" },
        data: expect.objectContaining({
          status: "shipped",
          carrier: "DPD",
          trackingNumber: "DPD999",
        }),
      }),
    );
  });
});
