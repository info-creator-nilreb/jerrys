import { describe, expect, it } from "vitest";
import { ORDER_EVENT_AVAILABLE_STOCK_RESERVED } from "@/lib/orders/order-events";

describe("ORDER_EVENT_AVAILABLE_STOCK_RESERVED", () => {
  it("ist ein stabiler Event-Typ für Reservierungen", () => {
    expect(ORDER_EVENT_AVAILABLE_STOCK_RESERVED).toBe("inventory.available_reserved");
  });
});
