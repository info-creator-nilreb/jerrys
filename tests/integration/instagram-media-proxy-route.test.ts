import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { __resetInstagramMediaApiRateLimitForTests } from "@/lib/security/instagram-media-api-rate-limit";

const resolveInstagramMediaProxy = vi.fn();

vi.mock("@/lib/instagram/proxy-media", () => ({
  resolveInstagramMediaProxy: (...args: unknown[]) => resolveInstagramMediaProxy(...args),
}));

afterEach(() => {
  __resetInstagramMediaApiRateLimitForTests();
  resolveInstagramMediaProxy.mockReset();
});

describe("GET /api/storefront/instagram-media/[id]", () => {
  it("liefert Bild-Bytes mit Cache-Headern", async () => {
    resolveInstagramMediaProxy.mockResolvedValue({
      ok: true,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      contentType: "image/jpeg",
    });
    const { GET } = await import("@/app/api/storefront/instagram-media/[id]/route");
    const req = new NextRequest("http://127.0.0.1/api/storefront/instagram-media/clid0123456789abcdefghi");
    const res = await GET(req, { params: Promise.resolve({ id: "clid0123456789abcdefghi" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body.byteLength).toBe(4);
  });

  it("antwortet 404 ohne Body bei unbekannter Cache-Zeile", async () => {
    resolveInstagramMediaProxy.mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("@/app/api/storefront/instagram-media/[id]/route");
    const req = new NextRequest("http://127.0.0.1/api/storefront/instagram-media/clidmissingrow00000001");
    const res = await GET(req, { params: Promise.resolve({ id: "clidmissingrow00000001" }) });
    expect(res.status).toBe(404);
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it("rate-limited nach 120 Anfragen derselben IP", async () => {
    resolveInstagramMediaProxy.mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("@/app/api/storefront/instagram-media/[id]/route");
    let last = 200;
    for (let i = 0; i < 121; i++) {
      const req = new NextRequest("http://127.0.0.1/api/storefront/instagram-media/clid0123456789abcdefghi", {
        headers: { "x-forwarded-for": "198.51.100.20" },
      });
      const res = await GET(req, { params: Promise.resolve({ id: "clid0123456789abcdefghi" }) });
      last = res.status;
    }
    expect(last).toBe(429);
    expect(resolveInstagramMediaProxy.mock.calls.length).toBe(120);
  });
});
