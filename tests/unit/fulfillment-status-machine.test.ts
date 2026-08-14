import { describe, expect, it } from "vitest";
import {
  fulfillmentStatusAfterOrderTransition,
  isAllowedFulfillmentTransition,
} from "@/features/orders";

describe("fulfillment-status-machine", () => {
  it("erlaubt unfulfilled → preparing → shipped → delivered", () => {
    expect(isAllowedFulfillmentTransition("unfulfilled", "preparing")).toBe(true);
    expect(isAllowedFulfillmentTransition("preparing", "shipped")).toBe(true);
    expect(isAllowedFulfillmentTransition("shipped", "delivered")).toBe(true);
    expect(isAllowedFulfillmentTransition("unfulfilled", "shipped")).toBe(false);
  });

  it("leitet Fulfillment aus Bestellstatus ab", () => {
    expect(fulfillmentStatusAfterOrderTransition("processing")).toBe("preparing");
    expect(fulfillmentStatusAfterOrderTransition("shipped")).toBe("shipped");
    expect(fulfillmentStatusAfterOrderTransition("abgeholt")).toBe("delivered");
    expect(fulfillmentStatusAfterOrderTransition("paid")).toBe(null);
  });
});
