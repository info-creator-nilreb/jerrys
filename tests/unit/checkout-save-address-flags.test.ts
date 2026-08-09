import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkoutFormSchema } from "@/lib/checkout/schemas";

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

describe("Checkout: Adresse im Konto speichern", () => {
  it("ist ohne Checkbox deaktiviert", () => {
    const parsed = checkoutFormSchema.safeParse(checkoutInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.saveShippingAddress).toBe(false);
      expect(parsed.data.saveBillingAddress).toBe(false);
    }
  });

  it("erkennt gesetzte Checkboxen aus dem Formular", () => {
    const parsed = checkoutFormSchema.safeParse(
      checkoutInput({ saveShippingAddress: "1", saveBillingAddress: "on" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.saveShippingAddress).toBe(true);
      expect(parsed.data.saveBillingAddress).toBe(true);
    }
  });

  it("ignoriert unerwartete Werte", () => {
    const parsed = checkoutFormSchema.safeParse(
      checkoutInput({ saveShippingAddress: "vielleicht" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.saveShippingAddress).toBe(false);
    }
  });
});
