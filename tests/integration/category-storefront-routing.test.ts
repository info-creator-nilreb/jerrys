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
      collections: [],
    });
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    const row = await listActiveProductsByCategorySlug("leer");
    expect(row?.products).toEqual([]);
  });

  it("mappt und dedupliziert aktive Produkte aus verknüpften Kollektionen", async () => {
    findFirstMock.mockResolvedValue({
      id: "c1",
      slug: "katzen",
      title: "Katzen",
      description: "…",
      parent: null,
      collections: [
        {
          collection: {
            products: [
              { sortOrder: 0, product: { id: "p1", slug: "design-katzenhoehle", title: "Höhle" } },
              { sortOrder: 1, product: { id: "p2", slug: "napf", title: "Napf" } },
            ],
          },
        },
        {
          collection: {
            products: [
              { sortOrder: 0, product: { id: "p1", slug: "design-katzenhoehle", title: "Höhle" } },
            ],
          },
        },
      ],
    });
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    const row = await listActiveProductsByCategorySlug("katzen");
    expect(row?.products).toEqual([
      { id: "p1", slug: "design-katzenhoehle", title: "Höhle" },
      { id: "p2", slug: "napf", title: "Napf" },
    ]);
  });
});
