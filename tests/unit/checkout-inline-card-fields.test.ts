import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { showCheckoutInlineCardFields } from "@/lib/checkout/inline-card-fields";

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
});
