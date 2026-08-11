import { afterEach, describe, expect, it, vi } from "vitest";
import {
  paginateInstagramGraphMedia,
  parseInstagramMediaRow,
} from "@/lib/instagram/media-fetch";

describe("parseInstagramMediaRow", () => {
  it("parsed gültige Graph-Zeilen", () => {
    const item = parseInstagramMediaRow({
      id: "1",
      caption: "Hallo",
      media_type: "IMAGE",
      media_url: "https://cdn.example/a.jpg",
      permalink: "https://instagram.com/p/x",
      timestamp: "2026-01-01T00:00:00+0000",
    });
    expect(item?.mediaType).toBe("IMAGE");
    expect(item?.permalink).toContain("instagram.com");
  });

  it("verwirft Zeilen ohne permalink", () => {
    expect(parseInstagramMediaRow({ id: "1", media_type: "IMAGE" })).toBeNull();
  });
});

describe("paginateInstagramGraphMedia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginiert weiter bis genug IMAGE-Typen vorhanden sind", async () => {
    const page1 = {
      data: [
        {
          id: "v1",
          media_type: "VIDEO",
          media_url: "https://cdn.example/v1.mp4",
          permalink: "https://instagram.com/reel/1",
        },
        {
          id: "i1",
          media_type: "IMAGE",
          media_url: "https://cdn.example/i1.jpg",
          permalink: "https://instagram.com/p/1",
        },
      ],
      paging: { next: "https://graph.example/page2" },
    };
    const page2 = {
      data: Array.from({ length: 12 }, (_, i) => ({
        id: `i${i + 2}`,
        media_type: "IMAGE",
        media_url: `https://cdn.example/i${i + 2}.jpg`,
        permalink: `https://instagram.com/p/${i + 2}`,
      })),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
      });
    vi.stubGlobal("fetch", fetchMock);

    const items = await paginateInstagramGraphMedia("https://graph.example/page1", {
      limit: 12,
      mediaTypes: new Set(["IMAGE", "CAROUSEL_ALBUM"]),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(12);
    expect(items.every((m) => m.mediaType === "IMAGE")).toBe(true);
    expect(items[0]?.id).toBe("i1");
  });
});
