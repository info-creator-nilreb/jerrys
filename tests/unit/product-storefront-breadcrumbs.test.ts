import { describe, expect, it } from "vitest";
import { buildStorefrontProductBreadcrumbItems } from "@/lib/catalog/product-storefront-breadcrumbs";

describe("buildStorefrontProductBreadcrumbItems", () => {
  it("nutzt Primary-Kategorie inkl. Parent", () => {
    const items = buildStorefrontProductBreadcrumbItems({
      titleCrumb: "Produkt X",
      primaryCategory: {
        slug: "kratzbaeume",
        title: "Kratzbäume",
        parent: { slug: "katzenmoebel", title: "Katzenmöbel" },
      },
    });
    expect(items.map((i) => i.label)).toEqual(["Start", "Katzenmöbel", "Kratzbäume", "Produkt X"]);
    expect(items[1]?.href).toBe("/kategorien/katzenmoebel");
    expect(items[2]?.href).toBe("/kategorien/kratzbaeume");
  });

  it("fällt auf Produkte-Listing ohne Primary zurück", () => {
    const items = buildStorefrontProductBreadcrumbItems({
      titleCrumb: "Produkt Y",
      primaryCategory: null,
    });
    expect(items.map((i) => i.label)).toEqual(["Start", "Produkte", "Produkt Y"]);
  });
});
