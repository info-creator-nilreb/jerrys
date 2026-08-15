import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isSepaDirectDebitCountry,
  paymentSourceForCheckoutForm,
} from "@/lib/checkout/paypal-order-payment-source";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/checkout/schemas";
import { isPayPalSepaDebitEnabled } from "@/lib/payments/paypal-config";
import { paypalVaultCustomerId } from "@/lib/payments/paypal-vault-customer-id";

function checkoutInput(extra: Record<string, unknown> = {}): CheckoutFormInput {
  const parsed = checkoutFormSchema.parse({
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
  });
  return parsed;
}

function withSepaEnabled<T>(fn: () => T): T {
  const prev = process.env.PAYPAL_SEPA_DEBIT_ENABLED;
  process.env.PAYPAL_SEPA_DEBIT_ENABLED = "1";
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.PAYPAL_SEPA_DEBIT_ENABLED;
    else process.env.PAYPAL_SEPA_DEBIT_ENABLED = prev;
  }
}

describe("isSepaDirectDebitCountry", () => {
  it("erlaubt DE und AT, nicht US", () => {
    expect(isSepaDirectDebitCountry("DE")).toBe(true);
    expect(isSepaDirectDebitCountry("at")).toBe(true);
    expect(isSepaDirectDebitCountry("US")).toBe(false);
  });
});

describe("isPayPalSepaDebitEnabled", () => {
  it("ist standardmäßig aus und akzeptiert 1/true/on", () => {
    const prev = process.env.PAYPAL_SEPA_DEBIT_ENABLED;
    try {
      delete process.env.PAYPAL_SEPA_DEBIT_ENABLED;
      expect(isPayPalSepaDebitEnabled()).toBe(false);
      process.env.PAYPAL_SEPA_DEBIT_ENABLED = "1";
      expect(isPayPalSepaDebitEnabled()).toBe(true);
      process.env.PAYPAL_SEPA_DEBIT_ENABLED = "true";
      expect(isPayPalSepaDebitEnabled()).toBe(true);
      process.env.PAYPAL_SEPA_DEBIT_ENABLED = "0";
      expect(isPayPalSepaDebitEnabled()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.PAYPAL_SEPA_DEBIT_ENABLED;
      else process.env.PAYPAL_SEPA_DEBIT_ENABLED = prev;
    }
  });
});

describe("paymentSourceForCheckoutForm", () => {
  it("setzt SEPA-Lastschrift mit Rechnungsadresse, nicht das generische PayPal-Wallet", () => {
    withSepaEnabled(() => {
      const d = checkoutInput({ checkoutPayPalSurface: "sepa" });
      const r = paymentSourceForCheckoutForm(d, null);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.source).toMatchObject({
        type: "sepa_debit",
        name: "Max Muster",
        email: "kunde@example.com",
        address: {
          address_line_1: "Invalidenstr. 12",
          admin_area_2: "Berlin",
          postal_code: "10115",
          country_code: "DE",
        },
      });
    });
  });

  it("lehnt SEPA ab, wenn der Shop die APM nicht aktiviert hat", () => {
    const prev = process.env.PAYPAL_SEPA_DEBIT_ENABLED;
    delete process.env.PAYPAL_SEPA_DEBIT_ENABLED;
    try {
      const r = paymentSourceForCheckoutForm(checkoutInput({ checkoutPayPalSurface: "sepa" }), null);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toContain("nicht verfügbar");
    } finally {
      if (prev === undefined) delete process.env.PAYPAL_SEPA_DEBIT_ENABLED;
      else process.env.PAYPAL_SEPA_DEBIT_ENABLED = prev;
    }
  });

  it("lehnt SEPA außerhalb der Eurozone ab", () => {
    withSepaEnabled(() => {
      const d = checkoutInput({
        checkoutPayPalSurface: "sepa",
        shippingCountry: "US",
        shippingZip: "10001",
        shippingLine1: "5th Avenue 12",
        shippingCity: "New York",
      });
      const r = paymentSourceForCheckoutForm(d, null);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toContain("Rechnungsland");
    });
  });

  it("vaultet neue Karten nur für eingeloggte Kunden", () => {
    const guest = paymentSourceForCheckoutForm(checkoutInput({ checkoutPayPalSurface: "card" }), null);
    expect(guest.ok).toBe(true);
    if (guest.ok) expect(guest.source).toBeUndefined();

    const shopId = "clxxxxxxxxxxxxxxxxxxxxxxx";
    const loggedIn = paymentSourceForCheckoutForm(
      checkoutInput({ checkoutPayPalSurface: "card" }),
      shopId,
    );
    expect(loggedIn.ok).toBe(true);
    if (!loggedIn.ok) return;
    expect(loggedIn.source).toEqual({
      type: "card_vault_on_success",
      customerId: paypalVaultCustomerId(shopId),
    });
  });

  it("bezahlt mit Vault-ID nur wenn der Kunde eingeloggt ist", () => {
    const guest = paymentSourceForCheckoutForm(
      checkoutInput({ checkoutPayPalSurface: "card", paypalVaultId: "tok_abc" }),
      null,
    );
    expect(guest.ok).toBe(true);
    if (guest.ok) expect(guest.source).toBeUndefined();

    const shopId = "cust01";
    const loggedIn = paymentSourceForCheckoutForm(
      checkoutInput({ checkoutPayPalSurface: "card", paypalVaultId: "tok_abc" }),
      shopId,
    );
    expect(loggedIn.ok).toBe(true);
    if (!loggedIn.ok) return;
    expect(loggedIn.source).toEqual({
      type: "vaulted_card",
      vaultId: "tok_abc",
      customerId: "cust01",
    });
  });

  it("lässt Apple Pay / PayPal ohne card/sepa payment_source", () => {
    for (const surface of ["paypal", "apple_pay", "google_pay"] as const) {
      const r = paymentSourceForCheckoutForm(checkoutInput({ checkoutPayPalSurface: surface }), "cust01");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.source).toBeUndefined();
    }
  });
});
