import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_PAY_JS_SRC,
  isPayPalApplePayConfigEligible,
  paypalCheckoutApplePaySdkSrc,
  paypalCheckoutWalletSdkSrc,
  paypalExpressButtonsOnlySdkSrc,
  paypalExpressSdkSrc,
} from "@/lib/payments/paypal-express-sdk";

describe("paypalExpressSdkSrc", () => {
  it("lädt Buttons und Apple Pay und aktiviert Apple-Pay-Funding", () => {
    const src = paypalExpressSdkSrc("test-client", "eur");
    const url = new URL(src);
    expect(url.origin + url.pathname).toBe("https://www.paypal.com/sdk/js");
    expect(url.searchParams.get("client-id")).toBe("test-client");
    expect(url.searchParams.get("components")).toBe("buttons,applepay");
    expect(url.searchParams.get("enable-funding")).toBe("applepay");
    expect(url.searchParams.get("components")).not.toContain("googlepay");
    expect(url.searchParams.get("enable-funding")).not.toContain("googlepay");
    expect(url.searchParams.get("currency")).toBe("EUR");
    expect(url.searchParams.get("intent")).toBe("capture");
  });
});

describe("paypalExpressButtonsOnlySdkSrc", () => {
  it("lädt nur Buttons als Fallback ohne Apple-Pay-Komponente", () => {
    const src = paypalExpressButtonsOnlySdkSrc("test-client", "eur");
    const url = new URL(src);
    expect(url.searchParams.get("components")).toBe("buttons");
    expect(url.searchParams.get("enable-funding")).toBeNull();
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

describe("paypalCheckoutApplePaySdkSrc", () => {
  it("lädt nur Apple Pay, wenn Google Pay das kombinierte Wallet-Skript blockiert", () => {
    const src = paypalCheckoutApplePaySdkSrc("test-client", "eur");
    const url = new URL(src);
    expect(url.searchParams.get("components")).toBe("applepay");
    expect(url.searchParams.get("enable-funding")).toBe("applepay");
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
    expect(src).toContain("paypalCheckoutApplePaySdkSrc");
    expect(src).toContain("tryLoadScript");
    expect(src).toContain("waitForPayPalWalletSdk");
    expect(src).toContain("GOOGLE_PAY_JS_SRC");
    expect(src).not.toContain("Zahlungs-SDK konnte nicht geladen werden");
  });
});

describe("Express-SDK-Laden", () => {
  it("fällt auf Buttons ohne Apple Pay zurück, wenn das kombinierte Skript scheitert", () => {
    const src = readFileSync(path.resolve("components/storefront/checkout-express-paypal.tsx"), "utf8");
    expect(src).toContain("paypalExpressSdkSrc");
    expect(src).toContain("paypalExpressButtonsOnlySdkSrc");
  });
});
