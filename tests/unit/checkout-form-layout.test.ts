import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHECKOUT_FORM_COLUMN_CLASS, CHECKOUT_SUMMARY_PANEL_CLASS } from "@/lib/checkout/checkout-form-layout";

describe("checkout form column width", () => {
  it("nutzt eine gemeinsame schmale Formularspalte (Shopify-like)", () => {
    expect(CHECKOUT_FORM_COLUMN_CLASS).toContain("max-w-xl");

    const form = readFileSync(path.resolve("components/storefront/checkout-form.tsx"), "utf8");
    expect(form).toContain("CHECKOUT_FORM_COLUMN_CLASS");
    expect(form).not.toMatch(/checkout-section-rechtliches.*max-w-md/);
    expect(form).not.toContain("lg:max-w-md");

    const payment = readFileSync(
      path.resolve("components/storefront/checkout-payment-methods.tsx"),
      "utf8",
    );
    expect(payment).not.toMatch(/mt-4 max-w-lg/);

    const summary = readFileSync(
      path.resolve("components/storefront/checkout-summary-aside.tsx"),
      "utf8",
    );
    expect(summary).toContain("CHECKOUT_SUMMARY_PANEL_CLASS");
    expect(CHECKOUT_SUMMARY_PANEL_CLASS).toContain("surface-subtle");

    expect(form).toContain("justify-center");
    expect(form).toContain("text-center");
  });
});
