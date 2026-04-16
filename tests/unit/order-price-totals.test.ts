import { describe, expect, it } from "vitest";
import { computeCheckoutOrderTotals } from "@/lib/tax/order-price-totals";

describe("computeCheckoutOrderTotals", () => {
  const lines = [
    { quantity: 2, priceGrossCents: 1000, taxRatePercent: 19 },
  ];
  const rates = { DE: 500 };

  it("EU: Brutto + MwSt.", () => {
    const t = computeCheckoutOrderTotals({
      lines,
      shippingCountryCode: "DE",
      shippingRatesCentsByCountry: rates,
      freeShippingFromSubtotalGrossCents: null,
    });
    expect(t.vatApplies).toBe(true);
    expect(t.subtotalCents).toBe(2000);
    expect(t.shippingCents).toBe(500);
    expect(t.taxAmountCents).toBeGreaterThan(0);
    expect(t.totalCents).toBe(2500);
  });

  it("Drittland: Netto, keine MwSt.", () => {
    const t = computeCheckoutOrderTotals({
      lines,
      shippingCountryCode: "CH",
      shippingRatesCentsByCountry: rates,
      freeShippingFromSubtotalGrossCents: null,
    });
    expect(t.vatApplies).toBe(false);
    expect(t.taxAmountCents).toBe(0);
    expect(t.subtotalCents).toBeLessThan(2000);
    expect(t.totalCents).toBe(t.subtotalCents + t.shippingCents);
  });
});
