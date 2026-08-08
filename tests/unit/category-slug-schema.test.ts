import { describe, expect, it } from "vitest";
import { categorySlugSchema } from "@/lib/catalog/category-schemas";

describe("categorySlugSchema", () => {
  it("akzeptiert gültige Slugs", () => {
    expect(categorySlugSchema.parse("hund")).toBe("hund");
    expect(categorySlugSchema.parse("fuer-den-garten")).toBe("fuer-den-garten");
  });

  it("lehnt Großbuchstaben und ungültige Zeichen ab", () => {
    expect(() => categorySlugSchema.parse("Hund")).toThrow();
    expect(() => categorySlugSchema.parse("-hund")).toThrow();
    expect(() => categorySlugSchema.parse("hund-")).toThrow();
  });
});
