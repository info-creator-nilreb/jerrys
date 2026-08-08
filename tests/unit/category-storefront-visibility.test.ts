import { describe, expect, it } from "vitest";
import {
  categoryListingShouldNotFound,
  isCategoryEligibleForPrimaryNav,
} from "@/lib/catalog/category-storefront-visibility";
import { buildStorefrontShopNavLinks } from "@/lib/storefront/shop-nav-links";

describe("isCategoryEligibleForPrimaryNav", () => {
  it("nur aktive Root-Kategorien mit sichtbarem Produkt", () => {
    expect(
      isCategoryEligibleForPrimaryNav({
        isActive: true,
        parentId: null,
        hasActiveProduct: true,
      }),
    ).toBe(true);
    expect(
      isCategoryEligibleForPrimaryNav({
        isActive: false,
        parentId: null,
        hasActiveProduct: true,
      }),
    ).toBe(false);
    expect(
      isCategoryEligibleForPrimaryNav({
        isActive: true,
        parentId: "parent-1",
        hasActiveProduct: true,
      }),
    ).toBe(false);
    expect(
      isCategoryEligibleForPrimaryNav({
        isActive: true,
        parentId: null,
        hasActiveProduct: false,
      }),
    ).toBe(false);
  });
});

describe("categoryListingShouldNotFound", () => {
  it("404 bei fehlender oder leerer Kategorie", () => {
    expect(categoryListingShouldNotFound(null)).toBe(true);
    expect(categoryListingShouldNotFound({ products: [] })).toBe(true);
    expect(categoryListingShouldNotFound({ products: [{}] })).toBe(false);
  });
});

describe("Nav aus eligible Kategorien", () => {
  it("filtert ineligible Kategorien vor buildStorefrontShopNavLinks", () => {
    const rows = [
      { slug: "hund", title: "Hund", isActive: true, parentId: null, hasActiveProduct: true },
      { slug: "versteckt", title: "Versteckt", isActive: false, parentId: null, hasActiveProduct: true },
      { slug: "kind", title: "Kind", isActive: true, parentId: "root", hasActiveProduct: true },
      { slug: "leer", title: "Leer", isActive: true, parentId: null, hasActiveProduct: false },
    ];
    const forNav = rows
      .filter((r) =>
        isCategoryEligibleForPrimaryNav({
          isActive: r.isActive,
          parentId: r.parentId,
          hasActiveProduct: r.hasActiveProduct,
        }),
      )
      .map(({ slug, title }) => ({ slug, title }));
    expect(buildStorefrontShopNavLinks(forNav)).toEqual([
      { href: "/produkte", label: "Alle Produkte" },
      { href: "/kategorien/hund", label: "Hund" },
    ]);
  });
});
