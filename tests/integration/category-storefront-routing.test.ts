import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    category: {
      findFirst: findFirstMock,
    },
  }),
}));

describe("listActiveProductsByCategorySlug (Integration, gemockte DB)", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("liefert null für unbekannten oder inaktiven Slug (Query filtert isActive)", async () => {
    findFirstMock.mockResolvedValue(null);
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    await expect(listActiveProductsByCategorySlug("archiviert")).resolves.toBeNull();
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "archiviert", isActive: true },
      }),
    );
  });

  it("liefert leere Produktliste für aktive Kategorie ohne sichtbare Produkte", async () => {
    findFirstMock.mockResolvedValue({
      id: "c1",
      slug: "leer",
      title: "Leer",
      description: null,
      parent: null,
      products: [],
    });
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    const row = await listActiveProductsByCategorySlug("leer");
    expect(row?.products).toEqual([]);
  });

  it("mappt aktive Produkte aus der Zuordnung", async () => {
    findFirstMock.mockResolvedValue({
      id: "c1",
      slug: "katzen",
      title: "Katzen",
      description: "…",
      parent: null,
      products: [
        {
          isPrimary: true,
          product: { id: "p1", slug: "design-katzenhoehle", title: "Höhle" },
        },
      ],
    });
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    const row = await listActiveProductsByCategorySlug("katzen");
    expect(row?.products).toEqual([
      { id: "p1", slug: "design-katzenhoehle", title: "Höhle" },
    ]);
  });
});
