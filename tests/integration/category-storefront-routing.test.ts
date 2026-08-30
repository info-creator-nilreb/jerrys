import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const orderItemGroupByMock = vi.fn();
const productCountMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    category: {
      findFirst: findFirstMock,
    },
    orderItem: {
      groupBy: orderItemGroupByMock,
    },
    product: {
      count: productCountMock,
    },
  }),
}));

function mockProduct(overrides: { id: string; slug: string; title: string }) {
  return {
    ...overrides,
    subtitle: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    currency: "EUR",
    amazonRatingAverage: null,
    amazonRatingCount: null,
    amazonReviewUrl: null,
    images: [],
    variants: [],
  };
}

function mockLinkedCollection(products: Array<{ sortOrder: number; product: ReturnType<typeof mockProduct> }>) {
  return {
    id: "col-1",
    membershipMode: "manual",
    ruleDays: null,
    products,
  };
}

describe("listActiveProductsByCategorySlug (Integration, gemockte DB)", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    orderItemGroupByMock.mockResolvedValue([]);
    productCountMock.mockResolvedValue(0);
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
          collection: mockLinkedCollection([
            { sortOrder: 0, product: mockProduct({ id: "p1", slug: "design-katzenhoehle", title: "Höhle" }) },
            { sortOrder: 1, product: mockProduct({ id: "p2", slug: "napf", title: "Napf" }) },
          ]),
        },
        {
          collection: mockLinkedCollection([
            { sortOrder: 0, product: mockProduct({ id: "p1", slug: "design-katzenhoehle", title: "Höhle" }) },
          ]),
        },
      ],
    });
    const { listActiveProductsByCategorySlug } = await import(
      "@/lib/catalog/category-queries"
    );
    const row = await listActiveProductsByCategorySlug("katzen");
    expect(row?.products).toEqual([
      expect.objectContaining({ id: "p1", slug: "design-katzenhoehle", title: "Höhle", isBestseller: false }),
      expect.objectContaining({ id: "p2", slug: "napf", title: "Napf", isBestseller: false }),
    ]);
  });
});
