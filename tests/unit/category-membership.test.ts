import { describe, expect, it } from "vitest";
import { primaryMustBeInSet } from "@/lib/catalog/category-membership";
import { productCategoryAssignmentSchema } from "@/lib/catalog/category-schemas";

describe("primaryMustBeInSet", () => {
  it("returns primary when listed", () => {
    expect(primaryMustBeInSet("a", ["a", "b"])).toBe("a");
  });

  it("returns null when primary not in set", () => {
    expect(primaryMustBeInSet("c", ["a", "b"])).toBeNull();
    expect(primaryMustBeInSet(null, ["a"])).toBeNull();
  });
});

describe("productCategoryAssignmentSchema", () => {
  it("parses categoryIds and primaryCategoryId from form-like input", () => {
    const parsed = productCategoryAssignmentSchema.parse({
      categoryIds: [" id1 ", "id2", "id1"],
      primaryCategoryId: "id2",
    });
    expect(parsed.categoryIds).toEqual(["id1", "id2"]);
    expect(parsed.primaryCategoryId).toBe("id2");
  });
});
