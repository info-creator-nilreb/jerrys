import { describe, expect, it } from "vitest";
import { evaluateOrderShipmentEligibility } from "@/features/fulfillment";

describe("evaluateOrderShipmentEligibility", () => {
  it("erlaubt paid/processing mit physischen Positionen", () => {
    expect(
      evaluateOrderShipmentEligibility({
        orderStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        physicalItemQuantity: 2,
      }),
    ).toEqual({ ok: true });
  });

  it("lehnt Workshop-only / ohne Varianten ab", () => {
    expect(
      evaluateOrderShipmentEligibility({
        orderStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        physicalItemQuantity: 0,
      }),
    ).toMatchObject({ ok: false, reason: "no_physical_items" });
  });

  it("lehnt storniert und bereits versandt ab", () => {
    expect(
      evaluateOrderShipmentEligibility({
        orderStatus: "cancelled",
        fulfillmentStatus: "unfulfilled",
        physicalItemQuantity: 1,
      }),
    ).toMatchObject({ ok: false, reason: "cancelled_or_refunded" });

    expect(
      evaluateOrderShipmentEligibility({
        orderStatus: "processing",
        fulfillmentStatus: "shipped",
        physicalItemQuantity: 1,
      }),
    ).toMatchObject({ ok: false, reason: "already_fully_shipped" });
  });
});
