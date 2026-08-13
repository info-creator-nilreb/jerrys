import { describe, expect, it } from "vitest";
import { resolveFooterLegalLinks } from "@/lib/shop/footer-settings";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import {
  HERO_CTA_CUSTOM_VALUE,
  resolveHeroCtaSelectValue,
} from "@/lib/content/hero-cta-targets";

describe("resolveFooterLegalLinks", () => {
  it("enthält Impressum und Datenschutz immer", () => {
    const links = resolveFooterLegalLinks({
      footerShowTagline: true,
      footerShowShopNav: false,
      footerShowCollections: true,
      footerShowCmsLinks: true,
      footerShowSocial: true,
      footerShowLegalAgb: false,
      footerShowLegalWiderruf: false,
      footerShowLegalRueckgabe: false,
      footerShowLegalVersand: false,
    });
    expect(links.map((l) => l.key)).toEqual(["impressum", "datenschutz"]);
  });

  it("respektiert optionale Legal-Toggles (Defaults ohne Rückgabe)", () => {
    const links = resolveFooterLegalLinks(JERRYS_SHOP_SETTINGS_DEFAULTS);
    expect(links.map((l) => l.key)).toEqual([
      "impressum",
      "datenschutz",
      "agb",
      "widerruf",
      "versand",
    ]);
  });
});

describe("resolveHeroCtaSelectValue", () => {
  it("erkennt Presets und Custom-Pfade", () => {
    expect(resolveHeroCtaSelectValue("")).toBe("");
    expect(resolveHeroCtaSelectValue("/produkte")).toBe("/produkte");
    expect(resolveHeroCtaSelectValue("/ueber-uns")).toBe(HERO_CTA_CUSTOM_VALUE);
  });
});
