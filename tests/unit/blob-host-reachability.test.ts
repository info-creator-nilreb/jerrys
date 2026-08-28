import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectBlockedBlobHosts,
  probeBlobUrl,
  urlHostIsBlocked,
} from "@/lib/catalog/blob-host-reachability";

describe("blob-host-reachability", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("erkennt 403 als blocked", async () => {
    global.fetch = vi.fn(async () => new Response("Your store is blocked", { status: 403 })) as never;
    expect(await probeBlobUrl("https://abc.public.blob.vercel-storage.com/x.jpg")).toBe("blocked");
  });

  it("probt jeden Host nur einmal", async () => {
    const fetchMock = vi.fn(async () => new Response("Your store is blocked", { status: 403 }));
    global.fetch = fetchMock as never;
    const blocked = await collectBlockedBlobHosts([
      "https://abc.public.blob.vercel-storage.com/a.jpg",
      "https://abc.public.blob.vercel-storage.com/b.jpg",
      "https://cdn.shopify.com/a.jpg",
    ]);
    expect(blocked.has("abc.public.blob.vercel-storage.com")).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(
      urlHostIsBlocked("https://abc.public.blob.vercel-storage.com/b.jpg", blocked),
    ).toBe(true);
  });
});
