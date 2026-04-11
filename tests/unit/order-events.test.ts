import { describe, expect, it, vi } from "vitest";
import { createOrderEvent, ORDER_EVENT_PLACED } from "@/lib/orders/order-events";

describe("createOrderEvent", () => {
  it("persistiert Typ und Metadaten", async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = { orderEvent: { create } };
    await createOrderEvent(db as never, "oid-1", ORDER_EVENT_PLACED, { orderNumber: "J-1" });
    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "oid-1",
        eventType: ORDER_EVENT_PLACED,
        metadata: { orderNumber: "J-1" },
      },
    });
  });

  it("setzt metadata nicht wenn nicht übergeben", async () => {
    const create = vi.fn().mockResolvedValue({});
    const db = { orderEvent: { create } };
    await createOrderEvent(db as never, "oid-1", ORDER_EVENT_PLACED);
    expect(create).toHaveBeenCalledWith({
      data: { orderId: "oid-1", eventType: ORDER_EVENT_PLACED },
    });
  });
});
