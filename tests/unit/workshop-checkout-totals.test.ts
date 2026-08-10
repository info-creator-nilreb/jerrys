import { describe, expect, it } from "vitest";
import { computeWorkshopCheckoutOrderTotals } from "@/lib/workshop/workshop-checkout-totals";

describe("computeWorkshopCheckoutOrderTotals", () => {
  it("setzt Versand immer auf 0, unabhängig vom Land", () => {
    const t = computeWorkshopCheckoutOrderTotals({
      lines: [{ quantity: 1, priceGrossCents: 5900, taxRatePercent: 19 }],
      shippingCountryCode: "DE",
    });
    expect(t.shippingCents).toBe(0);
    expect(t.subtotalCents).toBe(5900);
    expect(t.totalCents).toBe(5900);
    expect(t.vatApplies).toBe(true);
  });
});
