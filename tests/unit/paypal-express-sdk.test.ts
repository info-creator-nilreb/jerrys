import { describe, expect, it } from "vitest";
import {
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
    expect(url.searchParams.get("components")).toBe("buttons,applepay");
    expect(url.searchParams.get("enable-funding")).toBe("applepay");
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
