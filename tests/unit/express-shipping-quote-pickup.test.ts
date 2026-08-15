import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/checkout/cart-promotion-totals", () => ({
  resolveCartPromotionTotals: vi.fn(),
}));

import { resolveCartPromotionTotals } from "@/lib/checkout/cart-promotion-totals";
import { quoteExpressShippingForCart } from "@/lib/checkout/express-shipping-quote";

describe("quoteExpressShippingForCart", () => {
  afterEach(() => {
    vi.mocked(resolveCartPromotionTotals).mockReset();
  });

  it("gibt Abholung an die Total-Berechnung weiter", async () => {
    vi.mocked(resolveCartPromotionTotals).mockResolvedValue({
      ok: true,
      shippingCountry: "DE",
      currency: "EUR",
      deliveryMethod: "pickup",
      totals: {
        vatApplies: true,
        catalogSubtotalBeforeDiscountCents: 2000,
        subtotalCents: 1800,
        shippingCents: 0,
        taxAmountCents: 287,
        totalCents: 1800,
        discountOffSubtotalCents: 200,
        shippingSavedByPromotionCents: 0,
      },
      resolved: { kind: "none" },
      codeError: null,
    });

    const quote = await quoteExpressShippingForCart(
      "DE",
      { promotionCode: "SOMMER10", declineAutomatic: false },
      "pickup",
    );

    expect(resolveCartPromotionTotals).toHaveBeenCalledWith({
      shippingCountry: "DE",
      promotion: { promotionCode: "SOMMER10", declineAutomatic: false },
      deliveryMethod: "pickup",
    });
    expect(quote.ok).toBe(true);
    if (quote.ok) {
      expect(quote.shippingCents).toBe(0);
      expect(quote.totalGrossCents).toBe(1800);
      expect(quote.discountOffSubtotalCents).toBe(200);
    }
  });
});
