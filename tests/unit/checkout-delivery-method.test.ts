import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkoutFormSchema } from "@/lib/checkout/schemas";
import {
  parseCheckoutDeliveryMethod,
  isPickupDeliveryMethod,
  deliveryMethodLabel,
} from "@/lib/checkout/delivery-method";
import { computeCheckoutOrderTotalsWithDiscount } from "@/lib/promotions/checkout-totals";

function checkoutInput(extra: Record<string, unknown> = {}) {
  return {
    email: "kunde@example.com",
    shippingFirstName: "Max",
    shippingLastName: "Muster",
    shippingLine1: "Invalidenstr. 12",
    shippingZip: "10115",
    shippingCity: "Berlin",
    shippingCountry: "DE",
    billingUseShipping: "yes",
    paymentMethod: "paypal",
    rechtlicheKenntnis: "on",
    idempotencyKey: randomUUID(),
    ...extra,
  };
}

describe("Checkout-Lieferart", () => {
  it("parst unbekannte Werte als Versand", () => {
    expect(parseCheckoutDeliveryMethod(undefined)).toBe("shipping");
    expect(parseCheckoutDeliveryMethod("pickup")).toBe("pickup");
    expect(isPickupDeliveryMethod("pickup")).toBe(true);
    expect(deliveryMethodLabel("pickup")).toBe("Abholung");
    expect(deliveryMethodLabel("shipping")).toBe("Versand");
  });

  it("setzt im Schema Versand als Standard", () => {
    const parsed = checkoutFormSchema.safeParse(checkoutInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.deliveryMethod).toBe("shipping");
    }
  });

  it("übernimmt Abholung aus dem Formular", () => {
    const parsed = checkoutFormSchema.safeParse(checkoutInput({ deliveryMethod: "pickup" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.deliveryMethod).toBe("pickup");
    }
  });

  it("setzt Versandkosten bei Abholung auf 0, ohne Frei-Versand-Ersparnis", () => {
    const lines = [{ quantity: 1, priceGrossCents: 2000, taxRatePercent: 19 }];
    const rates = { DE: 590 };
    const shipped = computeCheckoutOrderTotalsWithDiscount({
      lines,
      shippingCountryCode: "DE",
      shippingRatesCentsByCountry: rates,
      freeShippingFromSubtotalGrossCents: null,
      discountOffSubtotalCents: 0,
    });
    expect(shipped.shippingCents).toBe(590);

    const pickup = computeCheckoutOrderTotalsWithDiscount({
      lines,
      shippingCountryCode: "DE",
      shippingRatesCentsByCountry: rates,
      freeShippingFromSubtotalGrossCents: null,
      discountOffSubtotalCents: 0,
      deliveryMethod: "pickup",
      applyFreeShippingPromotion: true,
    });
    expect(pickup.shippingCents).toBe(0);
    expect(pickup.shippingSavedByPromotionCents).toBe(0);
    expect(pickup.totalCents).toBe(pickup.subtotalCents);
  });
});
