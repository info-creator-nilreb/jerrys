import { afterEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const update = vi.fn();
const getInstagramAccessToken = vi.fn();
const fetchInstagramMediaById = vi.fn();
const fetchFacebookInstagramMediaById = vi.fn(); // pragma: allowlist secret
const mirrorInstagramImageUrl = vi.fn(async (_id: string, url: string) => url);

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    instagramMediaCache: { findFirst, update },
  }),
}));

vi.mock("@/lib/instagram/connection", () => ({
  getInstagramAccessToken: (...args: unknown[]) => getInstagramAccessToken(...args),
}));

vi.mock("@/lib/instagram/graph-api", () => ({
  fetchInstagramMediaById: (...args: unknown[]) => fetchInstagramMediaById(...args),
}));

vi.mock("@/lib/instagram/facebook-graph", () => ({ // pragma: allowlist secret
  fetchFacebookInstagramMediaById: (...args: unknown[]) => fetchFacebookInstagramMediaById(...args), // pragma: allowlist secret
}));

vi.mock("@/lib/instagram/mirror-media", () => ({
  mirrorInstagramImageUrl: (id: string, url: string) => mirrorInstagramImageUrl(id, url),
}));

describe("resolveInstagramMediaProxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    findFirst.mockReset();
    update.mockReset();
    getInstagramAccessToken.mockReset();
    fetchInstagramMediaById.mockReset();
    fetchFacebookInstagramMediaById.mockReset(); // pragma: allowlist secret
    mirrorInstagramImageUrl.mockClear();
  });

  it("liefert Bytes von der Cache-URL ohne Graph", async () => {
    findFirst.mockResolvedValue({
      id: "clid0123456789abcdefghi",
      mediaId: "17841400000000000",
      imageUrl: "https://scontent.cdninstagram.com/v/t51/a.jpg",
      thumbnailUrl: null,
    });
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } }),
      ),
    );

    const { resolveInstagramMediaProxy } = await import("@/lib/instagram/proxy-media");
    const result = await resolveInstagramMediaProxy("clid0123456789abcdefghi");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.contentType).toBe("image/jpeg");
    expect(getInstagramAccessToken).not.toHaveBeenCalled();
  });

  it("holt bei toter CDN-URL eine frische media_url von Graph", async () => {
    findFirst.mockResolvedValue({
      id: "clid0123456789abcdefghi",
      mediaId: "17841400000000000",
      imageUrl: "https://scontent.cdninstagram.com/v/t51/expired.jpg",
      thumbnailUrl: null,
    });
    getInstagramAccessToken.mockResolvedValue({
      accessToken: "token",
      authMode: "instagram",
      igUserId: "ig",
      username: "shop",
      tokenExpiresAt: null,
    });
    fetchInstagramMediaById.mockResolvedValue({
      id: "17841400000000000",
      mediaUrl: "https://scontent.cdninstagram.com/v/t51/fresh.jpg",
      thumbnailUrl: null,
      permalink: "https://www.instagram.com/p/x/",
      caption: null,
      mediaType: "IMAGE",
      timestamp: null,
    });
    update.mockResolvedValue({});

    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(
        new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { resolveInstagramMediaProxy } = await import("@/lib/instagram/proxy-media");
    const result = await resolveInstagramMediaProxy("clid0123456789abcdefghi");
    expect(result.ok).toBe(true);
    expect(fetchInstagramMediaById).toHaveBeenCalledWith("token", "17841400000000000");
    expect(update).toHaveBeenCalled();
  });

  it("antwortet 404 wenn die Cache-Zeile fehlt", async () => {
    findFirst.mockResolvedValue(null);
    const { resolveInstagramMediaProxy } = await import("@/lib/instagram/proxy-media");
    const result = await resolveInstagramMediaProxy("clidmissingrow0000000001");
    expect(result).toEqual({ ok: false, status: 404 });
  });
});
