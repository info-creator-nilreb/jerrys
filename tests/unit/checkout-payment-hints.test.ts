import { describe, expect, it } from "vitest";
import {
  checkoutPaymentMethodHint,
  isCheckoutWalletMethod,
} from "@/lib/checkout/checkout-payment-hints";

describe("checkoutPaymentMethodHint", () => {
  it("verspricht für Apple Pay und Google Pay kein PayPal-Redirect", () => {
    const apple = checkoutPaymentMethodHint({
      method: "apple_pay",
      submitLabel: "Jetzt kostenpflichtig bestellen",
      cardInline: true,
      nativeWallets: true,
      applePayReady: true,
    });
    const google = checkoutPaymentMethodHint({
      method: "google_pay",
      submitLabel: "Jetzt kostenpflichtig bestellen",
      cardInline: true,
      nativeWallets: true,
      googlePayReady: true,
    });
    expect(apple).toContain("Apple Pay");
    expect(apple).toContain("keine Weiterleitung zur PayPal-Website");
    expect(google).toContain("Google Pay");
    expect(google).toContain("keine Weiterleitung zur PayPal-Website");
  });

  it("beschreibt PayPal und SEPA als PayPal-Weiterleitung", () => {
    const paypal = checkoutPaymentMethodHint({
      method: "paypal",
      submitLabel: "Jetzt kostenpflichtig bestellen",
      cardInline: true,
      nativeWallets: true,
    });
    const sepa = checkoutPaymentMethodHint({
      method: "sepa",
      submitLabel: "Jetzt kostenpflichtig bestellen",
      cardInline: true,
      nativeWallets: true,
    });
    expect(paypal).toContain("PayPal-Konto");
    expect(sepa).toContain("SEPA-Lastschrift");
    expect(sepa).toContain("PayPal");
  });
});

describe("isCheckoutWalletMethod", () => {
  it("erkennt nur Apple Pay und Google Pay als native Wallets", () => {
    expect(isCheckoutWalletMethod("apple_pay")).toBe(true);
    expect(isCheckoutWalletMethod("google_pay")).toBe(true);
    expect(isCheckoutWalletMethod("paypal")).toBe(false);
    expect(isCheckoutWalletMethod("sepa")).toBe(false);
    expect(isCheckoutWalletMethod("card")).toBe(false);
  });
});
