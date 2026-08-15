import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_PAY_JS_SRC,
  isPayPalApplePayConfigEligible,
  paypalCheckoutWalletSdkSrc,
  paypalExpressSdkSrc,
} from "@/lib/payments/paypal-express-sdk";

describe("paypalExpressSdkSrc", () => {
  it("lädt Buttons und Apple Pay und aktiviert Apple-Pay-Funding", () => {
    const src = paypalExpressSdkSrc("test-client", "eur");
    const url = new URL(src);
    expect(url.origin + url.pathname).toBe("https://www.paypal.com/sdk/js");
    expect(url.searchParams.get("client-id")).toBe("test-client");
    expect(url.searchParams.get("components")).toBe("buttons,applepay,googlepay");
    expect(url.searchParams.get("enable-funding")).toBe("applepay,googlepay");
    expect(url.searchParams.get("currency")).toBe("EUR");
    expect(url.searchParams.get("intent")).toBe("capture");
  });
});

describe("paypalCheckoutWalletSdkSrc", () => {
  it("lädt Apple Pay und Google Pay ohne PayPal-Buttons-Redirect", () => {
    const src = paypalCheckoutWalletSdkSrc("test-client", "eur");
    const url = new URL(src);
    expect(url.searchParams.get("components")).toBe("applepay,googlepay");
    expect(url.searchParams.get("enable-funding")).toBe("applepay,googlepay");
  });
});

describe("isPayPalApplePayConfigEligible", () => {
  it("akzeptiert fehlendes isEligible als berechtigt", () => {
    expect(isPayPalApplePayConfigEligible({})).toBe(true);
    expect(isPayPalApplePayConfigEligible({ isEligible: true })).toBe(true);
    expect(isPayPalApplePayConfigEligible({ isEligible: false })).toBe(false);
    expect(isPayPalApplePayConfigEligible(null)).toBe(false);
    expect(isPayPalApplePayConfigEligible(undefined)).toBe(false);
  });
});

describe("Checkout-Wallets SDK-Laden", () => {
  it("lädt Google Pay und ein zweites PayPal-SDK nur optional, ohne Fehlerbanner", () => {
    expect(GOOGLE_PAY_JS_SRC).toBe("https://pay.google.com/gp/p/js/pay.js");
    const src = readFileSync(path.resolve("components/storefront/checkout-regular-wallets.tsx"), "utf8");
    expect(src).toContain("tryLoadScript");
    expect(src).toContain("waitForPayPalSdk");
    expect(src).toContain("GOOGLE_PAY_JS_SRC");
    expect(src).not.toContain("Zahlungs-SDK konnte nicht geladen werden");
  });
});
