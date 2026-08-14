import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkoutContactLoginHref } from "@/lib/checkout/contact-login-href";

describe("checkoutContactLoginHref", () => {
  it("öffnet das Header-Login auf derselben Checkout-Seite", () => {
    expect(checkoutContactLoginHref("/checkout")).toBe("/checkout?konto=anmelden");
    expect(checkoutContactLoginHref("/checkout/termine")).toBe("/checkout/termine?konto=anmelden");
  });
});

describe("Checkout-Kontakt ohne tote Controls", () => {
  it("entfernt Newsletter und totes Anmelden in beiden Checkout-Formularen", () => {
    const files = [
      "components/storefront/checkout-form.tsx",
      "components/storefront/workshop-checkout-form.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(path.resolve(rel), "utf8");
      expect(src).not.toMatch(/name="newsletter"/);
      expect(src).not.toMatch(/Neuigkeiten und Angebote/);
      expect(src).not.toMatch(/text-\[#9ca3af\]">Anmelden/);
      expect(src).toContain("checkoutContactLoginHref");
    }
  });
});
