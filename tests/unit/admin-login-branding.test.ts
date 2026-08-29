import { describe, expect, it } from "vitest";
import {
  resolveAdminDashboardWelcomeSubtitle,
  resolveAdminLoginHeroImageUrl,
  resolveAdminLoginTagline,
  resolveAdminMetadataTitleTemplate,
} from "@/lib/shop/admin-login-branding";
import { JERRYS_SHOP_SETTINGS_DEFAULTS } from "@/lib/shop/shop-settings-defaults";

const baseSettings = {
  ...JERRYS_SHOP_SETTINGS_DEFAULTS,
  id: "default" as const,
  updatedAt: null,
};

describe("resolveAdminLoginHeroImageUrl", () => {
  it("bevorzugt das Admin-Login-Hero vor OG", () => {
    expect(
      resolveAdminLoginHeroImageUrl({
        adminLoginHeroUrl: "https://cdn.example/edelweiss-hero.jpg",
        ogImageUrl: "https://cdn.example/og.jpg",
      }),
    ).toBe("https://cdn.example/edelweiss-hero.jpg");
  });

  it("nutzt OG nur wenn kein Admin-Hero gesetzt ist", () => {
    expect(
      resolveAdminLoginHeroImageUrl({
        adminLoginHeroUrl: null,
        ogImageUrl: "https://cdn.example/og.jpg",
      }),
    ).toBe("https://cdn.example/og.jpg");
  });

  it("liefert null ohne shop-eigene URLs (kein jerry's-Katzenfoto)", () => {
    expect(
      resolveAdminLoginHeroImageUrl({
        adminLoginHeroUrl: null,
        ogImageUrl: null,
      }),
    ).toBeNull();
  });
});

describe("resolveAdminLoginTagline", () => {
  it("nutzt Kurzbeschreibung statt fest codiertem Text", () => {
    expect(
      resolveAdminLoginTagline({
        ...baseSettings,
        shopName: "edel weiss",
        shortDescription: "Schmuck & Design aus Berlin",
      }),
    ).toBe("Schmuck & Design aus Berlin");
  });

  it("fällt auf Shopnamen zurück", () => {
    expect(
      resolveAdminLoginTagline({
        ...baseSettings,
        shopName: "edel weiss",
        shortDescription: "",
      }),
    ).toBe("edel weiss");
  });
});

describe("resolveAdminDashboardWelcomeSubtitle", () => {
  it("nutzt den konfigurierten Shopnamen", () => {
    expect(
      resolveAdminDashboardWelcomeSubtitle({
        shopName: "edel weiss",
      }),
    ).toBe("Hier steuerst du Katalog und Shop von edel weiss.");
  });
});

describe("resolveAdminMetadataTitleTemplate", () => {
  it("nutzt den konfigurierten Shopnamen", () => {
    expect(
      resolveAdminMetadataTitleTemplate({
        shopName: "edel weiss",
      }),
    ).toBe("%s | Admin | edel weiss");
  });
});
