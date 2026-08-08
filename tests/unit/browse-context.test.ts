import { describe, expect, it } from "vitest";
import {
  browseContextFromPathname,
  parseBrowseContext,
  serializeBrowseContext,
} from "@/lib/storefront/browse-context";

describe("browse context cookie", () => {
  it("roundtrip collection", () => {
    const ctx = { kind: "collection" as const, slug: "sommer", title: "Sommer" };
    expect(parseBrowseContext(serializeBrowseContext(ctx))).toEqual(ctx);
  });

  it("roundtrip category mit Parent", () => {
    const ctx = {
      kind: "category" as const,
      slug: "kratz",
      title: "Kratz",
      parent: { slug: "moebel", title: "Möbel" },
    };
    expect(parseBrowseContext(serializeBrowseContext(ctx))).toEqual(ctx);
  });

  it("leitet Kontext aus Pfad ab", () => {
    expect(browseContextFromPathname("/produkte")?.kind).toBe("catalog");
    expect(browseContextFromPathname("/kollektionen/sommer")).toEqual({
      kind: "collection",
      slug: "sommer",
    });
  });
});
