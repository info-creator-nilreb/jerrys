import { describe, expect, it } from "vitest";
import {
  invoiceSellerLinesFromSettings,
  loadInvoiceLogoEmbed,
} from "@/lib/shop/invoice-branding";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import type { ShopSettingsDTO } from "@/lib/shop/shop-settings";

function settings(overrides: Partial<ShopSettingsDTO> = {}): ShopSettingsDTO {
  return {
    id: "default",
    ...JERRYS_SHOP_SETTINGS_DEFAULTS,
    updatedAt: null,
    ...overrides,
  };
}

describe("invoiceSellerLinesFromSettings", () => {
  it("baut Ausstellerzeilen aus ShopSettings", () => {
    const { lines, ustId } = invoiceSellerLinesFromSettings(
      settings({
        legalName: "Test e.U.",
        shopName: "Shop",
        addressLine1: "Weg 1",
        addressZip: "10437",
        addressCity: "Berlin",
        vatId: "DE123",
      }),
    );
    expect(lines[0]).toBe("Test e.U.");
    expect(lines).toContain("Weg 1");
    expect(lines.some((l) => l.includes("10437"))).toBe(true);
    expect(ustId).toBe("DE123");
  });
});

describe("loadInvoiceLogoEmbed", () => {
  it("lädt Static-Fallback ohne Throw", async () => {
    const logo = await loadInvoiceLogoEmbed(settings());
    expect(logo).not.toBeNull();
    expect(logo?.kind === "jpg" || logo?.kind === "png").toBe(true);
    expect(logo!.bytes.byteLength).toBeGreaterThan(100);
  });

  it("gibt null bei kaputter Remote-URL und fehlendem Fallback nicht hard — Fallback greift", async () => {
    const logo = await loadInvoiceLogoEmbed(
      settings({
        logoLightUrl: "https://example.invalid/missing-logo.png",
      }),
    );
    // Remote fail → Static-Fallback unter /branding/
    expect(logo).not.toBeNull();
  });
});
