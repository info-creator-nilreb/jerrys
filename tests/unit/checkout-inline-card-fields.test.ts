import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { showCheckoutInlineCardFields } from "@/lib/checkout/inline-card-fields";

vi.mock("next/image", () => ({
  default: function MockImage(props: { alt?: string }) {
    return createElement("img", { alt: props.alt ?? "" });
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
  });

  it("rendert Kartenfelder unter der Karten-Option, vor dem Hinweis", async () => {
    const { CheckoutPaymentMethods } = await import("@/components/storefront/checkout-payment-methods");
    const html = renderToStaticMarkup(
      createElement(CheckoutPaymentMethods, {
        value: "card",
        onChange: () => undefined,
        cardInline: true,
        cardFields: createElement("div", { id: "checkout-card-fields" }, "Kartenfelder"),
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
  });
});
