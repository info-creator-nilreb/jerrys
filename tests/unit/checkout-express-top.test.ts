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
});
