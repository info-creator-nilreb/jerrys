import { describe, expect, it } from "vitest";
import {
  adminCustomerNumberLabel,
  customerKeyFromNormalizedEmail,
  normalizeAdminCustomerEmail,
} from "@/lib/admin/customer-queries";
import {
  isPayPalExpressPlaceholderEmail,
  orderContributesToAdminCustomer,
  PAYPAL_EXPRESS_PLACEHOLDER_EMAIL,
} from "@/lib/checkout/paypal-express-placeholder";

describe("normalizeAdminCustomerEmail", () => {
  it("trimmt und wandelt in Kleinbuchstaben um", () => {
    expect(normalizeAdminCustomerEmail("  Foo@BAR.de  ")).toBe("foo@bar.de");
  });
});

describe("customerKeyFromNormalizedEmail", () => {
  it("liefert 12 hex-Zeichen kleingeschrieben", () => {
    const key = customerKeyFromNormalizedEmail("buyer@example.com");
    expect(key).toMatch(/^[0-9a-f]{12}$/);
  });

  it("ist deterministisch", () => {
    const a = customerKeyFromNormalizedEmail("a@b.co");
    const b = customerKeyFromNormalizedEmail("a@b.co");
    expect(a).toBe(b);
  });
});

describe("adminCustomerNumberLabel", () => {
  it("prefix K- und Großbuchstaben", () => {
    expect(adminCustomerNumberLabel("a1b2c3d4e5f6")).toBe("K-A1B2C3D4E5F6");
  });
});

describe("orderContributesToAdminCustomer", () => {
  it("schließt Express-Platzhalter und offene Zahlungen aus", () => {
    expect(
      orderContributesToAdminCustomer({
        status: "pending_payment",
        email: PAYPAL_EXPRESS_PLACEHOLDER_EMAIL,
      }),
    ).toBe(false);
    expect(
      orderContributesToAdminCustomer({
        status: "pending_payment",
        email: "kunde@example.com",
      }),
    ).toBe(false);
    expect(
      orderContributesToAdminCustomer({
        status: "cancelled",
        email: "paypal-express@example.invalid",
      }),
    ).toBe(false);
    expect(
      orderContributesToAdminCustomer({
        status: "paid",
        email: "kunde@example.com",
      }),
    ).toBe(true);
  });
});

describe("isPayPalExpressPlaceholderEmail", () => {
  it("erkennt aktuellen und Legacy-Platzhalter", () => {
    expect(isPayPalExpressPlaceholderEmail(PAYPAL_EXPRESS_PLACEHOLDER_EMAIL)).toBe(true);
    expect(isPayPalExpressPlaceholderEmail("paypal-express@example.invalid")).toBe(true);
    expect(isPayPalExpressPlaceholderEmail("echt@jerry-s.com")).toBe(false);
  });
});
