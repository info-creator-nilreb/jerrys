import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { showCheckoutInlineCardFields } from "@/lib/checkout/inline-card-fields";
import {
  visibleCheckoutPaymentMethodRows,
} from "@/components/storefront/checkout-payment-methods";

vi.mock("next/image", () => ({
  default: function MockImage(props: { alt?: string }) {
    return createElement("img", { alt: props.alt ?? "" });
  },
}));

vi.mock("lucide-react", () => ({
  CreditCard: function CreditCard() {
    return createElement("span", { "data-icon": "credit-card" });
  },
}));

describe("showCheckoutInlineCardFields", () => {
  it("zeigt Kartenfelder nur unter der ausgewählten Karten-Option", () => {
    expect(showCheckoutInlineCardFields("card", "card", true, true)).toBe(true);
    expect(showCheckoutInlineCardFields("card", "paypal", true, true)).toBe(false);
    expect(showCheckoutInlineCardFields("paypal", "paypal", true, true)).toBe(false);
    expect(showCheckoutInlineCardFields("card", "card", false, true)).toBe(false);
    expect(showCheckoutInlineCardFields("card", "card", true, false)).toBe(false);
  });
});

describe("Checkout-Kartenfelder-Reihenfolge", () => {
  it("hält Kartenfelder in der Zahlungssektion, AGB unmittelbar vor dem Bestellbutton", () => {
    const src = readFileSync(path.resolve("components/storefront/checkout-form.tsx"), "utf8");
    const cardFieldsProp = src.indexOf("cardFields={");
    const legal = src.indexOf("{legalConsentBlock}");
    const submit = src.lastIndexOf("Jetzt kostenpflichtig bestellen");
    expect(cardFieldsProp).toBeGreaterThan(-1);
    expect(legal).toBeGreaterThan(cardFieldsProp);
    expect(submit).toBeGreaterThan(legal);
    expect(src.indexOf("hidePayButton")).toBeGreaterThan(cardFieldsProp);
    expect(src).toContain("checkoutFormDraftFromForm");
    expect(src).not.toContain("clearCheckoutFormDraft");
    expect(src).toContain("CheckoutRegularWallets");
    expect(src).toContain("pageshow");
    expect(src).toContain("pagehide");
    expect(src).toContain("mergeCheckoutFormDraft");
    expect(src).toContain("draftHydratedRef");
    expect(src).toContain("isCheckoutWalletMethod");
    expect(src).toContain("isCheckoutPayPalMethodVisible");
    expect(src).toContain("sepaAvailable");
  });

  it("rendert Kartenfelder unter der Karten-Option, vor dem Hinweis", async () => {
    const { CheckoutPaymentMethods } = await import("@/components/storefront/checkout-payment-methods");
    const html = renderToStaticMarkup(
      createElement(CheckoutPaymentMethods, {
        value: "card",
        onChange: () => undefined,
        cardInline: true,
        cardFields: createElement("div", { id: "checkout-card-fields" }, "Kartenfelder"),
        sepaAvailable: true,
      }),
    );
    const sepaIdx = html.indexOf("SEPA Lastschrift");
    const cardLabelIdx = html.indexOf("Debit- oder Kreditkarte");
    const cardIdx = html.indexOf('id="checkout-card-fields"');
    const hintIdx = html.indexOf("Geben Sie Ihre Kartendaten ein");
    expect(cardIdx).toBeGreaterThan(-1);
    expect(cardLabelIdx).toBeGreaterThan(sepaIdx);
    expect(cardIdx).toBeGreaterThan(cardLabelIdx);
    expect(hintIdx).toBeGreaterThan(cardIdx);
    expect(html).not.toContain("Apple Pay");
    expect(html).not.toContain("Google Pay");
    expect(html).toContain('value="sepa"');
    expect(html).toContain('value="card"');
    expect(html).not.toContain("overflow-hidden rounded-lg border border-[#e5e7eb]");
  });

  it("verspricht bei Apple Pay keinen PayPal-Redirect", async () => {
    const { CheckoutPaymentMethods } = await import("@/components/storefront/checkout-payment-methods");
    const html = renderToStaticMarkup(
      createElement(CheckoutPaymentMethods, {
        value: "apple_pay",
        onChange: () => undefined,
        nativeWallets: true,
        applePayReady: true,
      }),
    );
    expect(html).toContain("Apple Pay");
    expect(html).toContain("keine Weiterleitung zur PayPal-Website");
    expect(html).not.toContain("Dort wählen Sie die für Sie verfügbare Option");
    expect(html).not.toContain("Google Pay");
  });

  it("listet Apple Pay und Google Pay nicht, solange sie nicht bereit sind", async () => {
    const { CheckoutPaymentMethods } = await import("@/components/storefront/checkout-payment-methods");
    const html = renderToStaticMarkup(
      createElement(CheckoutPaymentMethods, {
        value: "paypal",
        onChange: () => undefined,
        nativeWallets: true,
      }),
    );
    expect(html).toContain("PayPal");
    expect(html).not.toContain("Apple Pay");
    expect(html).not.toContain("Google Pay");
    expect(html).not.toContain("SEPA Lastschrift");
  });
});

describe("visibleCheckoutPaymentMethodRows", () => {
  it("zeigt Wallets nur bei Bereitschaft und SEPA nur wenn der Shop sie anbietet", () => {
    const hidden = visibleCheckoutPaymentMethodRows({
      nativeWallets: true,
      applePayReady: false,
      googlePayReady: false,
      sepaAvailable: false,
    }).map((r) => r.id);
    expect(hidden).toEqual(["paypal", "card"]);

    const shown = visibleCheckoutPaymentMethodRows({
      nativeWallets: true,
      applePayReady: true,
      googlePayReady: true,
      sepaAvailable: true,
    }).map((r) => r.id);
    expect(shown).toEqual(["paypal", "apple_pay", "google_pay", "sepa", "card"]);
  });
});
