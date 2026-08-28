import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInstagramMediaBytes } from "@/lib/instagram/fetch-remote-media";

describe("fetchInstagramMediaBytes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lädt JPEG ohne Referer", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInstagramMediaBytes(
      "https://scontent.cdninstagram.com/v/t51/photo.jpg",
    );
    expect(result?.contentType).toBe("image/jpeg");
    expect(result?.bytes.byteLength).toBe(4);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("referer")).toBeNull();
    expect(init.redirect).toBe("manual");
  });

  it("folgt Redirects nur auf erlaubte Hosts", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://scontent-fra3-2.cdninstagram.com/v/t51/photo.jpg" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInstagramMediaBytes(
      "https://scontent.cdninstagram.com/v/t51/photo.jpg",
    );
    expect(result?.bytes.byteLength).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("bricht bei Redirect auf fremden Host ab (SSRF)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/steal" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchInstagramMediaBytes(
      "https://scontent.cdninstagram.com/v/t51/photo.jpg",
    );
    expect(result).toBeNull();
  });

  it("lehnt nicht-HTTPS und fremde Start-URLs ab", async () => {
    expect(await fetchInstagramMediaBytes("http://scontent.cdninstagram.com/x.jpg")).toBeNull();
    expect(await fetchInstagramMediaBytes("https://example.com/x.jpg")).toBeNull();
  });
});
