import { describe, expect, it } from "vitest";
import {
  isAllowedInstagramMediaHost,
  isAllowedInstagramMediaUrl,
  isDurableStorefrontImageUrl,
  isInstagramMediaCacheId,
  storefrontInstagramMediaSrc,
} from "@/lib/instagram/storefront-media-url";

describe("isInstagramMediaCacheId", () => {
  it("akzeptiert CUIDs", () => {
    expect(isInstagramMediaCacheId("clxyz0123456789abcdefgh")).toBe(true);
  });

  it("lehnt Pfad-Injection ab", () => {
    expect(isInstagramMediaCacheId("../etc/passwd")).toBe(false);
    expect(isInstagramMediaCacheId("a")).toBe(false);
    expect(isInstagramMediaCacheId("https://evil.example/x")).toBe(false);
  });
});

describe("isDurableStorefrontImageUrl", () => {
  it("behandelt Blob und lokale Pfade als dauerhaft", () => {
    expect(isDurableStorefrontImageUrl("/media/ig.jpg")).toBe(true);
    expect(
      isDurableStorefrontImageUrl("https://abc.public.blob.vercel-storage.com/instagram/x.jpg"),
    ).toBe(true);
  });

  it("behandelt Meta-CDN nicht als dauerhaft", () => {
    expect(
      isDurableStorefrontImageUrl("https://scontent-fra3-1.cdninstagram.com/v/t51.123/x.jpg?_nc_ht=scontent"),
    ).toBe(false);
  });
});

describe("storefrontInstagramMediaSrc", () => {
  it("proxied Meta-CDN über den Shop-Origin", () => {
    expect(
      storefrontInstagramMediaSrc(
        "clxyz0123456789abcdefgh",
        "https://scontent.cdninstagram.com/v/t51/photo.jpg",
      ),
    ).toBe("/api/storefront/instagram-media/clxyz0123456789abcdefgh");
  });

  it("lässt Blob-URLs unverändert", () => {
    const blob = "https://abc.public.blob.vercel-storage.com/instagram/media/1.jpg";
    expect(storefrontInstagramMediaSrc("clxyz0123456789abcdefgh", blob)).toBe(blob);
  });
});

describe("isAllowedInstagramMediaHost", () => {
  it("erlaubt Instagram- und Meta-CDN", () => {
    expect(isAllowedInstagramMediaHost("scontent-fra3-1.cdninstagram.com")).toBe(true);
    expect(isAllowedInstagramMediaHost("instagram.fna.fbcdn.net")).toBe(true);
    expect(isAllowedInstagramMediaHost("lookaside.fbsbx.com")).toBe(true);
  });

  it("lehnt fremde Hosts ab", () => {
    expect(isAllowedInstagramMediaHost("evil.example")).toBe(false);
    expect(isAllowedInstagramMediaUrl("http://scontent.cdninstagram.com/x.jpg")).toBe(false);
    expect(isAllowedInstagramMediaUrl("https://evil.example/cdninstagram.com.jpg")).toBe(false);
  });
});
