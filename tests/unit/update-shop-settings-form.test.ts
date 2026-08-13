import { describe, expect, it } from "vitest";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";
import { parseShopSettingsUpdate } from "@/lib/shop/shop-settings-schemas";
import { shopSettingsInputFromFormData } from "@/lib/shop/update-shop-settings";

describe("shopSettingsInputFromFormData", () => {
  it("mappt FormData-Felder und lässt Asset-URLs null (Upload-Pfad)", () => {
    const fd = new FormData();
    fd.set("shopName", "jerry's");
    fd.set("shortDescription", "Katzenmöbel");
    fd.set("primaryColor", "#8bbe25");
    fd.set("primaryHoverColor", "#74a320");
    fd.set("contactEmail", "info@jerry-s.com");
    fd.set("contactPhone", "+49 30 123");
    fd.set("supportEmail", "");
    fd.set("legalName", "Dr. Test");
    fd.set("addressLine1", "Straße 1");
    fd.set("addressLine2", "");
    fd.set("addressZip", "10437");
    fd.set("addressCity", "Berlin");
    fd.set("addressCountry", "de");
    fd.set("vatId", "DE123");
    fd.set("instagramUrl", "https://www.instagram.com/jerrys.design/");
    fd.set("facebookUrl", "");
    fd.set("emailFromName", "jerry's");
    fd.set("showAllProductsInNav", "false");
    fd.append("showAllProductsInNav", "true");
    fd.set("showTermineInNav", "false");
    fd.set("desktopShopNavMode", "burger");
    fd.set("headerNavPlacement", "under");
    fd.set("footerShowTagline", "true");
    fd.set("footerShowShopNav", "false");
    fd.set("footerShowCollections", "true");
    fd.set("footerShowCmsLinks", "true");
    fd.set("footerShowSocial", "true");
    fd.set("footerShowLegalAgb", "true");
    fd.set("footerShowLegalWiderruf", "true");
    fd.set("footerShowLegalRueckgabe", "false");
    fd.set("footerShowLegalVersand", "true");

    const input = shopSettingsInputFromFormData(fd);
    expect(input.shopName).toBe("jerry's");
    expect(input.addressCountry).toBe("de");
    expect(input.logoLightUrl).toBeNull();
    expect(input.faviconUrl).toBeNull();
    expect(input.showAllProductsInNav).toBe(true);
    expect(input.showTermineInNav).toBe(false);
    expect(input.desktopShopNavMode).toBe("burger");
    expect(input.headerNavPlacement).toBe("under");
    expect(input.footerShowShopNav).toBe(false);
    expect(input.footerShowCollections).toBe(true);
    expect(input.footerShowLegalRueckgabe).toBe(false);

    const parsed = parseShopSettingsUpdate({
      ...input,
      addressCountry: "DE",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.shopName).toBe("jerry's");
    expect(parsed.data.supportEmail).toBeNull();
    expect(parsed.data.facebookUrl).toBeNull();
    expect(parsed.data.showAllProductsInNav).toBe(true);
    expect(parsed.data.showTermineInNav).toBe(false);
    expect(parsed.data.desktopShopNavMode).toBe("burger");
    expect(parsed.data.headerNavPlacement).toBe("under");
    expect(parsed.data.footerShowShopNav).toBe(false);
    expect(parsed.data.footerShowLegalVersand).toBe(true);
  });

  it("akzeptiert die Seed-Defaults über Form-ähnliche Strings", () => {
    const d = JERRYS_SHOP_SETTINGS_DEFAULTS;
    const fd = new FormData();
    for (const [key, value] of Object.entries({
      shopName: d.shopName,
      shortDescription: d.shortDescription,
      primaryColor: d.primaryColor,
      primaryHoverColor: d.primaryHoverColor,
      contactEmail: d.contactEmail,
      contactPhone: d.contactPhone,
      supportEmail: d.supportEmail,
      legalName: d.legalName,
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2 ?? "",
      addressZip: d.addressZip,
      addressCity: d.addressCity,
      addressCountry: d.addressCountry,
      vatId: d.vatId,
      instagramUrl: d.instagramUrl,
      facebookUrl: d.facebookUrl ?? "",
      emailFromName: d.emailFromName,
    })) {
      fd.set(key, value);
    }
    const parsed = parseShopSettingsUpdate(shopSettingsInputFromFormData(fd));
    expect(parsed.success).toBe(true);
  });
});
