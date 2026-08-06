import { describe, expect, it, vi } from "vitest";
import { createOrderEvent, ORDER_EVENT_PLACED } from "@/lib/orders/order-events";

describe("createOrderEvent", () => {
  it("persistiert Typ, Metadaten und Outbox-Eintrag", async () => {
    const orderCreate = vi.fn().mockResolvedValue({});
    const outboxCreate = vi.fn().mockResolvedValue({});
    const db = {
      orderEvent: { create: orderCreate },
      integrationOutboxMessage: { create: outboxCreate },
    };
    await createOrderEvent(db as never, "oid-1", ORDER_EVENT_PLACED, { orderNumber: "J-1" });
    expect(orderCreate).toHaveBeenCalledWith({
      data: {
        orderId: "oid-1",
        eventType: ORDER_EVENT_PLACED,
        metadata: { orderNumber: "J-1" },
      },
    });
    expect(outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aggregateType: "order",
        aggregateId: "oid-1",
        eventType: ORDER_EVENT_PLACED,
        status: "pending",
      }),
    });
  });

  it("setzt metadata nicht wenn nicht übergeben", async () => {
    const orderCreate = vi.fn().mockResolvedValue({});
    const outboxCreate = vi.fn().mockResolvedValue({});
    const db = {
      orderEvent: { create: orderCreate },
      integrationOutboxMessage: { create: outboxCreate },
    };
    await createOrderEvent(db as never, "oid-1", ORDER_EVENT_PLACED);
    expect(orderCreate).toHaveBeenCalledWith({
      data: { orderId: "oid-1", eventType: ORDER_EVENT_PLACED },
    });
    expect(outboxCreate).toHaveBeenCalled();
  });
});
