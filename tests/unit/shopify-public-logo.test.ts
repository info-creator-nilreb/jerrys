import { describe, expect, it } from "vitest";
import { extractShopifyLogoUrlFromHtml } from "@/lib/shop/shopify-public-logo";

describe("extractShopifyLogoUrlFromHtml", () => {
  it("bevorzugt CDN-Logo gegenüber Social-Sharing", () => {
    const html = `
      <meta property="og:image" content="https://cdn.shopify.com/s/files/1/x/edel_weiss_social_sharing.jpg?v=1">
      <img src="https://cdn.shopify.com/s/files/1/x/files/Logo_transparent.png?v=2" alt="Logo">
    `;
    expect(extractShopifyLogoUrlFromHtml(html, "https://edelweissdesigns.de")).toContain(
      "Logo_transparent.png",
    );
  });

  it("löst relative Shop-Pfade auf", () => {
    const html = `<img alt="logo" src="/cdn/shop/files/Logo_transparent.png">`;
    expect(extractShopifyLogoUrlFromHtml(html, "https://edelweissdesigns.de")).toBe(
      "https://edelweissdesigns.de/cdn/shop/files/Logo_transparent.png",
    );
  });
});
