import { describe, expect, it } from "vitest";
import {
  pickPrimaryCategoryRef,
  uniqueCategoriesBySlug,
} from "@/lib/catalog/category-membership";
import { categoryUpsertSchema } from "@/lib/catalog/category-schemas";

describe("pickPrimaryCategoryRef", () => {
  it("prefers root categories over children", () => {
    const primary = pickPrimaryCategoryRef([
      { slug: "kind", title: "Kind", sortOrder: 0, parentId: "root" },
      { slug: "root", title: "Root", sortOrder: 5, parentId: null },
    ]);
    expect(primary?.slug).toBe("root");
  });

  it("uses lowest sortOrder among roots", () => {
    const primary = pickPrimaryCategoryRef([
      { slug: "b", title: "B", sortOrder: 2, parentId: null },
      { slug: "a", title: "A", sortOrder: 1, parentId: null },
    ]);
    expect(primary?.slug).toBe("a");
  });

  it("returns null for empty list", () => {
    expect(pickPrimaryCategoryRef([])).toBeNull();
  });
});

describe("uniqueCategoriesBySlug", () => {
  it("keeps first occurrence", () => {
    expect(
      uniqueCategoriesBySlug([
        { slug: "a", title: "A1" },
        { slug: "b", title: "B" },
        { slug: "a", title: "A2" },
      ]),
    ).toEqual([
      { slug: "a", title: "A1" },
      { slug: "b", title: "B" },
    ]);
  });
});

describe("categoryUpsertSchema", () => {
  it("parses collectionIds from form-like input", () => {
    const parsed = categoryUpsertSchema.parse({
      title: "Katzen",
      slug: "katzen",
      sortOrder: 0,
      parentId: "",
      collectionIds: [" id1 ", "id2", "id1"],
    });
    expect(parsed.collectionIds).toEqual(["id1", "id2"]);
  });
});
