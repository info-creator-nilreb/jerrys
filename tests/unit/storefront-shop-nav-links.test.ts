import { describe, expect, it } from "vitest";
import {
  buildStorefrontShopNavLinks,
  isStorefrontShopNavLinkActive,
} from "@/lib/storefront/shop-nav-links";

describe("buildStorefrontShopNavLinks", () => {
  it("liefert Shop ohne Kollektionen", () => {
    expect(buildStorefrontShopNavLinks([])).toEqual([{ href: "/produkte", label: "Shop" }]);
  });

  it("hängt aktive Kollektionen als benannte Links an", () => {
    expect(
      buildStorefrontShopNavLinks([{ slug: "sommer", title: "Sommer 2026" }]),
    ).toEqual([
      { href: "/produkte", label: "Shop" },
      { href: "/kollektionen/sommer", label: "Sommer 2026" },
    ]);
  });
});

describe("isStorefrontShopNavLinkActive", () => {
  it("erkennt Produkt- und Kollektionspfade", () => {
    expect(isStorefrontShopNavLinkActive("/produkte/foo", "/produkte")).toBe(true);
    expect(isStorefrontShopNavLinkActive("/kollektionen/sommer", "/kollektionen/sommer")).toBe(true);
    expect(isStorefrontShopNavLinkActive("/kollektionen", "/kollektionen/sommer")).toBe(false);
  });
});
