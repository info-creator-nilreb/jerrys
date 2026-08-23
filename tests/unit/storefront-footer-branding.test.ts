import { describe, expect, it } from "vitest";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import { shopFooterBgColor } from "@/lib/shop/storefront-branding";

describe("shopFooterBgColor", () => {
  it("nutzt footerBgColor aus den Settings", () => {
    expect(shopFooterBgColor({ footerBgColor: "#112233" })).toBe("#112233");
  });

  it("fällt auf jerry’s-Default zurück", () => {
    expect(shopFooterBgColor({ footerBgColor: "" })).toBe(
      JERRYS_SHOP_SETTINGS_DEFAULTS.footerBgColor,
    );
  });
});
