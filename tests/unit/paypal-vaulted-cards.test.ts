import { describe, expect, it } from "vitest";
import {
  formatPayPalCardBrand,
  formatPayPalCardExpiry,
  formatPayPalVaultedCardLabel,
} from "@/lib/payments/paypal-vaulted-cards";
import { paypalCardFieldsSdkSrc } from "@/lib/payments/paypal-card-fields-sdk";

describe("formatPayPalVaultedCardLabel", () => {
  it("formatiert Marke, letzte Ziffern und Ablauf", () => {
    expect(formatPayPalCardBrand("VISA")).toBe("Visa");
    expect(formatPayPalCardExpiry("2027-02")).toBe("02/27");
    expect(
      formatPayPalVaultedCardLabel({
        id: "tok",
        brand: "MASTERCARD",
        lastDigits: "4444",
        expiry: "2028-11",
      }),
    ).toBe("Mastercard •••• 4444 (gültig bis 11/28)");
  });
});

describe("paypalCardFieldsSdkSrc", () => {
  it("lädt nur Card Fields", () => {
    const url = new URL(paypalCardFieldsSdkSrc("client-1", "eur"));
    expect(url.searchParams.get("components")).toBe("card-fields");
    expect(url.searchParams.get("intent")).toBe("capture");
    expect(url.searchParams.get("currency")).toBe("EUR");
  });
});
