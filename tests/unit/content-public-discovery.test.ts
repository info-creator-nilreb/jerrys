import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    contentPage: { findMany },
  }),
}));

vi.mock("@/lib/db/prisma-error", () => ({
  isMissingSchemaError: () => false,
}));

describe("content public discovery", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("fragt nur published Seiten ab (Drafts ausgeschlossen)", async () => {
    findMany.mockResolvedValue([
      {
        id: "1",
        slug: "ueber-uns",
        pageType: "content",
        title: "Über uns",
        robotsIndex: true,
        updatedAt: new Date("2026-08-11T00:00:00.000Z"),
        publishedAt: new Date("2026-08-11T00:00:00.000Z"),
      },
    ]);

    const { listPublishedContentPagesForDiscovery, listPublishedContentNavLinks } =
      await import("@/lib/content/content-public-discovery");

    const pages = await listPublishedContentPagesForDiscovery({
      robotsIndexOnly: true,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "published",
          robotsIndex: true,
        }),
      }),
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.path).toBe("/ueber-uns");

    findMany.mockResolvedValue([
      {
        id: "1",
        slug: "ueber-uns",
        pageType: "content",
        title: "Über uns",
        robotsIndex: true,
        updatedAt: new Date(),
        publishedAt: new Date(),
      },
    ]);
    const nav = await listPublishedContentNavLinks();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "published",
          pageType: { in: ["content"] },
        }),
      }),
    );
    expect(nav).toEqual([{ href: "/ueber-uns", label: "Über uns" }]);
  });
});
