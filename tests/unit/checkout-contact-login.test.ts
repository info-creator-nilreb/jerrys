import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPEN_STOREFRONT_LOGIN_EVENT } from "@/lib/storefront/open-login-event";

describe("OPEN_STOREFRONT_LOGIN_EVENT", () => {
  it("nutzt denselben Event-Namen wie der Header-Listener", () => {
    expect(OPEN_STOREFRONT_LOGIN_EVENT).toBe("jerrys:open-storefront-login");
    const header = readFileSync(path.resolve("components/storefront/header-account-popover.tsx"), "utf8");
    expect(header).toContain("OPEN_STOREFRONT_LOGIN_EVENT");
  });
});

describe("Checkout-Kontakt ohne tote Controls", () => {
  it("entfernt Newsletter und öffnet Login per Button statt totem Text", () => {
    const files = [
      "components/storefront/checkout-form.tsx",
      "components/storefront/workshop-checkout-form.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(path.resolve(rel), "utf8");
      expect(src).not.toMatch(/name="newsletter"/);
      expect(src).not.toMatch(/Neuigkeiten und Angebote/);
      expect(src).not.toMatch(/text-\[#9ca3af\]">Anmelden/);
      expect(src).toContain("openStorefrontLogin");
      expect(src).toContain('type="button"');
    }
  });
});
