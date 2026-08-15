import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Checkout Express oben", () => {
  it("setzt Express-Checkout unter die Checkout-Überschrift, vor Kontakt", () => {
    const src = readFileSync(path.resolve("components/storefront/checkout-form.tsx"), "utf8");
    const title = src.indexOf("{checkoutTitle}");
    const express = src.indexOf("<CheckoutPageExpress");
    const contact = src.indexOf('id="checkout-section-contact"');
    expect(title).toBeGreaterThan(-1);
    expect(express).toBeGreaterThan(title);
    expect(contact).toBeGreaterThan(express);
    expect(src).toContain("workshopMpa");
  });

  it("spannt Express-Hinweis und Buttons über die volle Checkout-Spalte", () => {
    const page = readFileSync(path.resolve("components/storefront/checkout-page-express.tsx"), "utf8");
    expect(page).toContain('className="mt-6 w-full space-y-2.5"');
    expect(page).not.toContain("max-w-lg");
    expect(page).not.toContain("max-w-md");

    const buttons = readFileSync(
      path.resolve("components/storefront/checkout-express-paypal.tsx"),
      "utf8",
    );
    expect(buttons).toContain('variant === "checkout" ? "w-full" : "w-full max-w-md"');
    expect(buttons).toContain("w-full max-w-none text-left");
  });

  it("zeigt Apple Pay am Gerät, nicht nur nach PayPal-isEligible", () => {
    const buttons = readFileSync(
      path.resolve("components/storefront/checkout-express-paypal.tsx"),
      "utf8",
    );
    expect(buttons).toContain("applePayDeviceReady");
    expect(buttons).toContain("applePaySessionCanMakePayments");
    expect(buttons).toContain("FUNDING?.APPLEPAY");
    expect(buttons).toContain("isPayPalApplePayConfigEligible");
    expect(buttons).toContain("expressPromotionPayload");
    expect(buttons).toContain("checkoutPromotionCode");
  });
});
