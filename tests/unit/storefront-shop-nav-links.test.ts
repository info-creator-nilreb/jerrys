import { describe, expect, it } from "vitest";
import {
  buildStorefrontMerchandisingLinks,
  buildStorefrontShopNavLinks,
  isStorefrontShopNavLinkActive,
  resolveFooterMerchandisingLinks,
} from "@/lib/storefront/shop-nav-links";

describe("buildStorefrontShopNavLinks", () => {
  it("liefert Alle Produkte und Termine ohne Kategorien", () => {
    expect(buildStorefrontShopNavLinks([])).toEqual([
      { href: "/produkte", label: "Alle Produkte" },
      { href: "/termine", label: "Termine" },
    ]);
  });

  it("hängt Top-Kategorien an (max. 6)", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      slug: `kat-${i}`,
      title: `Kat ${i}`,
    }));
    const links = buildStorefrontShopNavLinks(many);
    expect(links).toHaveLength(8);
    expect(links[1]).toEqual({ href: "/termine", label: "Termine" });
    expect(links[2]).toEqual({ href: "/kategorien/kat-0", label: "Kat 0" });
    expect(links[7]).toEqual({ href: "/kategorien/kat-5", label: "Kat 5" });
  });
});

describe("buildStorefrontMerchandisingLinks", () => {
  it("mappt Kollektionen für Footer", () => {
    expect(
      buildStorefrontMerchandisingLinks([{ slug: "sommer", title: "Sommer 2026" }]),
    ).toEqual([{ href: "/kollektionen/sommer", label: "Sommer 2026" }]);
  });
});

describe("resolveFooterMerchandisingLinks", () => {
  it("entfernt Kollektionen mit gleichem Label wie eine Kategorie", () => {
    const shop = buildStorefrontShopNavLinks([{ slug: "katzenhoehlen", title: "Katzenhöhlen" }]);
    expect(
      resolveFooterMerchandisingLinks(shop, [
        { slug: "katzenhoehlen", title: "Katzenhöhlen" },
        { slug: "neu", title: "Neuheiten" },
      ]),
    ).toEqual([{ href: "/kollektionen/neu", label: "Neuheiten" }]);
  });

  it("liefert Index-Link wenn alle Kollektionsnamen kollidieren", () => {
    const shop = buildStorefrontShopNavLinks([{ slug: "katzenhoehlen", title: "Katzenhöhlen" }]);
    expect(
      resolveFooterMerchandisingLinks(shop, [{ slug: "katzenhoehlen", title: "Katzenhöhlen" }]),
    ).toEqual([{ href: "/kollektionen", label: "Kollektionen" }]);
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
