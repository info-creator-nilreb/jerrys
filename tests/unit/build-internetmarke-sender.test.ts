import { describe, expect, it } from "vitest";
import { buildInternetmarkeSenderFromShopSettings } from "@/features/fulfillment";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";

describe("buildInternetmarkeSenderFromShopSettings", () => {
  it("nutzt Shop-Defaults wenn Settings fehlen", () => {
    const result = buildInternetmarkeSenderFromShopSettings(null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sender.name).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.legalName);
    expect(result.sender.postalCode).toBe(JERRYS_SHOP_SETTINGS_DEFAULTS.addressZip);
    expect(result.sender.country).toBe("DE");
  });
});
