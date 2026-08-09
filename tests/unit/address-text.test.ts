import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeAddressText } from "@/lib/checkout/address-text";
import { customerAddressCreateSchema } from "@/features/customers/application/customer-address-schemas";
import { checkoutFormSchema } from "@/lib/checkout/schemas";

describe("normalizeAddressText", () => {
  it("fasst Mehrfach-Leerzeichen zusammen und trimmt", () => {
    expect(normalizeAddressText("Invalidenstr.  12")).toBe("Invalidenstr. 12");
    expect(normalizeAddressText("  Berlin \t Mitte\n")).toBe("Berlin Mitte");
    expect(normalizeAddressText("Haupt\u00a0\u00a0weg 3")).toBe("Haupt weg 3");
  });
});

describe("Adress-Schemas normalisieren Leerzeichen", () => {
  const base = {
    kind: "shipping",
    firstName: "Max",
    lastName: "Muster",
    line1: "Invalidenstr.  12",
    zip: " 10115 ",
    city: "Berlin",
    country: "DE",
  };

  it("Adressbuch: Straße aus Vorschlag plus Hausnummer", () => {
    const parsed = customerAddressCreateSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.line1).toBe("Invalidenstr. 12");
      expect(parsed.data.zip).toBe("10115");
    }
  });

  it("Checkout: Snapshot-Felder ohne doppelte Leerzeichen", () => {
    const parsed = checkoutFormSchema.safeParse({
      email: "kunde@example.com",
      shippingFirstName: "Max",
      shippingLastName: "Muster",
      shippingLine1: "Invalidenstr.  12",
      shippingZip: "10115",
      shippingCity: "Berlin  ",
      shippingCountry: "DE",
      billingUseShipping: "yes",
      paymentMethod: "paypal",
      rechtlicheKenntnis: "on",
      idempotencyKey: randomUUID(),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.shippingLine1).toBe("Invalidenstr. 12");
      expect(parsed.data.shippingCity).toBe("Berlin");
      expect(parsed.data.billingLine1).toBe("Invalidenstr. 12");
    }
  });
});
