import { describe, expect, it } from "vitest";
import { resolveProductBreadcrumbItems } from "@/lib/catalog/product-storefront-breadcrumbs";

const primary = {
  slug: "kratzbaeume",
  title: "Kratzbäume",
  parent: { slug: "katzenmoebel", title: "Katzenmöbel" },
};

describe("resolveProductBreadcrumbItems", () => {
  it("bevorzugt Kollektions-Kontext", () => {
    const items = resolveProductBreadcrumbItems({
      titleCrumb: "Produkt X",
      browseContext: { kind: "collection", slug: "sommer", title: "Sommer" },
      primaryCategory: primary,
      categorySlugs: new Set(["kratzbaeume"]),
      collectionSlugs: new Set(["sommer"]),
      categoryBySlug: new Map([["kratzbaeume", primary]]),
      collectionTitleBySlug: new Map([["sommer", "Sommer"]]),
    });
    expect(items.map((i) => i.label)).toEqual(["Start", "Sommer", "Produkt X"]);
  });

  it("nutzt Kategorie-Kontext mit Parent", () => {
    const cat = {
      slug: "kratzbaeume",
      title: "Kratzbäume",
      parent: { slug: "katzenmoebel", title: "Katzenmöbel" },
    };
    const items = resolveProductBreadcrumbItems({
      titleCrumb: "Produkt Y",
      browseContext: {
        kind: "category",
        slug: "kratzbaeume",
        title: "Kratzbäume",
        parent: { slug: "katzenmoebel", title: "Katzenmöbel" },
      },
      primaryCategory: null,
      categorySlugs: new Set(["kratzbaeume"]),
      collectionSlugs: new Set(),
      categoryBySlug: new Map([["kratzbaeume", cat]]),
      collectionTitleBySlug: new Map(),
    });
    expect(items.map((i) => i.label)).toEqual([
      "Start",
      "Katzenmöbel",
      "Kratzbäume",
      "Produkt Y",
    ]);
  });

  it("Deep-Link: Primary-Kategorie ohne Kategorien-Index", () => {
    const items = resolveProductBreadcrumbItems({
      titleCrumb: "Produkt Z",
      browseContext: null,
      primaryCategory: primary,
      categorySlugs: new Set(["kratzbaeume"]),
      collectionSlugs: new Set(),
      categoryBySlug: new Map([["kratzbaeume", primary]]),
      collectionTitleBySlug: new Map(),
    });
    expect(items.map((i) => i.label)).toEqual([
      "Start",
      "Katzenmöbel",
      "Kratzbäume",
      "Produkt Z",
    ]);
    expect(items.some((i) => i.label === "Kategorien")).toBe(false);
  });

  it("Katalog-Kontext", () => {
    const items = resolveProductBreadcrumbItems({
      titleCrumb: "P",
      browseContext: { kind: "catalog" },
      primaryCategory: null,
      categorySlugs: new Set(),
      collectionSlugs: new Set(),
      categoryBySlug: new Map(),
      collectionTitleBySlug: new Map(),
    });
    expect(items.map((i) => i.label)).toEqual(["Start", "Alle Produkte", "P"]);
  });
});
