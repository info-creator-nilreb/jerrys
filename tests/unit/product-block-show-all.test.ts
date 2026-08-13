import { describe, expect, it } from "vitest";
import { parseContentBlockData } from "@/lib/content/block-schemas";
import {
  resolveProductBlockShowAllHref,
  resolveProductBlockShowAllLabel,
} from "@/lib/content/blocks/product-block-show-all";

describe("resolveProductBlockShowAllHref", () => {
  it("liefert null ohne CTA", () => {
    expect(
      resolveProductBlockShowAllHref({
        showAllCta: false,
        showAllHref: "/produkte",
        kind: "catalog",
      }),
    ).toBeNull();
  });

  it("nutzt Custom-Pfad wenn gesetzt", () => {
    expect(
      resolveProductBlockShowAllHref({
        showAllCta: true,
        showAllHref: "/aktion",
        kind: "collection",
        collectionSlug: "klassiker",
      }),
    ).toBe("/aktion");
  });

  it("leitet Kollektion / Kategorie / Katalog ab", () => {
    expect(
      resolveProductBlockShowAllHref({
        showAllCta: true,
        showAllHref: null,
        kind: "collection",
        collectionSlug: "klassiker",
      }),
    ).toBe("/kollektionen/klassiker");
    expect(
      resolveProductBlockShowAllHref({
        showAllCta: true,
        showAllHref: "",
        kind: "category",
        categorySlug: "moebel",
      }),
    ).toBe("/kategorien/moebel");
    expect(
      resolveProductBlockShowAllHref({
        showAllCta: true,
        showAllHref: null,
        kind: "catalog",
      }),
    ).toBe("/produkte");
  });
});

describe("resolveProductBlockShowAllLabel", () => {
  it("fällt auf Alle anzeigen zurück", () => {
    expect(resolveProductBlockShowAllLabel(null)).toBe("Alle anzeigen");
    expect(resolveProductBlockShowAllLabel("  ")).toBe("Alle anzeigen");
    expect(resolveProductBlockShowAllLabel("Zur Kollektion")).toBe("Zur Kollektion");
  });
});

describe("product CMS blocks parse", () => {
  it("akzeptiert curatedProductList mit Kollektion und CTA", () => {
    const r = parseContentBlockData("curatedProductList", {
      source: "collection",
      collectionSlug: "klassiker",
      limit: 4,
      showAllCta: true,
      showAllLabel: "Alle anzeigen",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        source: "collection",
        collectionSlug: "klassiker",
        limit: 4,
        showAllCta: true,
      });
    }
  });

  it("akzeptiert productCategoryPick collection-Modus und Defaults für CTA", () => {
    const r = parseContentBlockData("productCategoryPick", {
      mode: "collection",
      collectionSlug: "neu",
      limit: 6,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        mode: "collection",
        showAllCta: false,
        limit: 6,
      });
    }
  });

  it("bleibt rückwärtskompatibel zu alter curatedProductList-Form", () => {
    const r = parseContentBlockData("curatedProductList", {
      source: "allActive",
      productIds: [],
      limit: 12,
    });
    expect(r.ok).toBe(true);
  });
});
