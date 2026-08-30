import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PayPalPayLaterMessage", () => {
  it("nutzt die offizielle Messages-Komponente und reagiert auf Betragsänderungen", () => {
    const src = readFileSync(
      path.resolve("components/storefront/paypal-pay-later-message.tsx"),
      "utf8",
    );
    expect(src).toContain("paypalPayLaterMessagesSdkSrc");
    expect(src).toContain("paypal.Messages");
    expect(src).toContain("amountGrossCents");
    expect(src).toContain("pageType");
  });

  it("ist auf PDP, Warenkorb und Checkout eingebunden", () => {
    const pdp = readFileSync(
      path.resolve("components/storefront/product-pdp-purchase-panel.tsx"),
      "utf8",
    );
    const cart = readFileSync(path.resolve("app/(storefront)/warenkorb/page.tsx"), "utf8");
    const checkout = readFileSync(path.resolve("components/storefront/checkout-form.tsx"), "utf8");

    expect(pdp).toContain('pageType="product-details"');
    expect(cart).toContain('pageType="cart"');
    expect(checkout).toContain('pageType="checkout"');
  });
});
