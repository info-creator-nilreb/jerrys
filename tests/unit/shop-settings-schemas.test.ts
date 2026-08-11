import { describe, expect, it } from "vitest";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import {
  hexColorSchema,
  parseShopSettingsUpdate,
  shopSettingsValuesSchema,
} from "@/lib/shop/shop-settings-schemas";

describe("hexColorSchema", () => {
  it("normalisiert gültige #RRGGBB-Farben", () => {
    expect(hexColorSchema.parse("#8BBE25")).toBe("#8bbe25");
    expect(hexColorSchema.parse("  #74a320  ")).toBe("#74a320");
  });

  it("lehnt Kurzform und ungültige Werte ab", () => {
    expect(() => hexColorSchema.parse("#8be")).toThrow();
    expect(() => hexColorSchema.parse("8bbe25")).toThrow();
    expect(() => hexColorSchema.parse("green")).toThrow();
  });
});

describe("shopSettingsValuesSchema / parseShopSettingsUpdate", () => {
  it("akzeptiert die jerry’s-Seed-Defaults", () => {
    const parsed = shopSettingsValuesSchema.parse(JERRYS_SHOP_SETTINGS_DEFAULTS);
    expect(parsed.shopName).toBe("jerry's");
    expect(parsed.primaryColor).toBe("#8bbe25");
    expect(parsed.primaryHoverColor).toBe("#74a320");
    expect(parsed.contactEmail).toBe("info@jerry-s.com");
    expect(parsed.instagramUrl).toBe("https://www.instagram.com/jerrys.design/");
  });

  it("liefert Kontrast-Warnungen ohne Parse-Fehler für jerry’s-Grün", () => {
    const result = parseShopSettingsUpdate(JERRYS_SHOP_SETTINGS_DEFAULTS);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.primaryColor).toBe("#8bbe25");
    // Weiß auf #8bbe25 liegt unter UI-AA 3:1 — Slice 1 warnt, blockiert nicht.
    expect(result.contrastWarnings.length).toBeGreaterThan(0);
  });

  it("lehnt freie CSS und unsichere URLs ab", () => {
    expect(
      shopSettingsValuesSchema.safeParse({
        ...JERRYS_SHOP_SETTINGS_DEFAULTS,
        primaryColor: "rgb(139,190,37)",
      }).success,
    ).toBe(false);

    expect(
      shopSettingsValuesSchema.safeParse({
        ...JERRYS_SHOP_SETTINGS_DEFAULTS,
        instagramUrl: "http://example.com/insecure",
      }).success,
    ).toBe(false);

    expect(
      shopSettingsValuesSchema.safeParse({
        ...JERRYS_SHOP_SETTINGS_DEFAULTS,
        contactEmail: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("normalisiert leere optionale Felder zu null", () => {
    const parsed = shopSettingsValuesSchema.parse({
      ...JERRYS_SHOP_SETTINGS_DEFAULTS,
      facebookUrl: "",
      addressLine2: "   ",
      logoLightUrl: null,
    });
    expect(parsed.facebookUrl).toBeNull();
    expect(parsed.addressLine2).toBeNull();
    expect(parsed.logoLightUrl).toBeNull();
  });
});
