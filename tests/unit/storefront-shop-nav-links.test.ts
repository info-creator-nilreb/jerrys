import { describe, expect, it } from "vitest";
import {
  buildStorefrontMerchandisingLinks,
  buildStorefrontShopNavLinks,
  isStorefrontShopNavLinkActive,
} from "@/lib/storefront/shop-nav-links";

describe("buildStorefrontShopNavLinks", () => {
  it("liefert Alle Produkte ohne Kategorien", () => {
    expect(buildStorefrontShopNavLinks([])).toEqual([
      { href: "/produkte", label: "Alle Produkte" },
    ]);
  });

  it("hängt Top-Kategorien an (max. 6)", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      slug: `kat-${i}`,
      title: `Kat ${i}`,
    }));
    const links = buildStorefrontShopNavLinks(many);
    expect(links).toHaveLength(7);
    expect(links[1]).toEqual({ href: "/kategorien/kat-0", label: "Kat 0" });
    expect(links[6]).toEqual({ href: "/kategorien/kat-5", label: "Kat 5" });
  });
});

describe("buildStorefrontMerchandisingLinks", () => {
  it("mappt Kollektionen für Footer", () => {
    expect(
      buildStorefrontMerchandisingLinks([{ slug: "sommer", title: "Sommer 2026" }]),
    ).toEqual([{ href: "/kollektionen/sommer", label: "Sommer 2026" }]);
  });
});

describe("isStorefrontShopNavLinkActive", () => {
  it("erkennt Produkt- und Kategoriepfade", () => {
    expect(isStorefrontShopNavLinkActive("/produkte/foo", "/produkte")).toBe(true);
    expect(isStorefrontShopNavLinkActive("/kategorien/hund", "/kategorien/hund")).toBe(true);
    expect(isStorefrontShopNavLinkActive("/kollektionen/sommer", "/kollektionen/sommer")).toBe(
      true,
    );
  });
});
