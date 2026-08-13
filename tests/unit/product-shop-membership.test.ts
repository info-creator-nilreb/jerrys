import { describe, expect, it } from "vitest";
import { resolveSelectedShopAssignment } from "@/lib/catalog/product-shop-membership";

describe("resolveSelectedShopAssignment", () => {
  const options = {
    categories: [
      {
        id: "cat-a",
        title: "Katzen",
        slug: "katzen",
        parentTitle: null,
        primaryCollectionId: "col-a",
      },
      {
        id: "cat-b",
        title: "Hunde",
        slug: "hunde",
        parentTitle: null,
        primaryCollectionId: "col-b",
      },
    ],
    campaignCollections: [
      { id: "col-sale", title: "Sommer", slug: "sommer" },
      { id: "col-new", title: "Neu", slug: "neu" },
    ],
  };

  it("leitet Kategorie- und Extra-Auswahl aus Mitgliedschaften ab", () => {
    const selected = resolveSelectedShopAssignment({
      membershipCollectionIds: ["col-a", "col-sale", "col-other"],
      options,
    });
    expect(selected.categoryIds).toEqual(["cat-a"]);
    expect(selected.extraCollectionIds).toEqual(["col-sale"]);
  });

  it("liefert leere Auswahl ohne Mitgliedschaften", () => {
    expect(
      resolveSelectedShopAssignment({ membershipCollectionIds: [], options }),
    ).toEqual({ categoryIds: [], extraCollectionIds: [] });
  });
});
