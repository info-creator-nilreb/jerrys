import { describe, expect, it } from "vitest";
import { resolveLegacyRedirect } from "@/lib/site/legacy-redirects";

describe("resolveLegacyRedirect", () => {
  it("leitet exakte Legacy-Pfade um", () => {
    expect(resolveLegacyRedirect("/cart")).toBe("/warenkorb");
    expect(resolveLegacyRedirect("/CART/")).toBe("/warenkorb");
    expect(resolveLegacyRedirect("/shop")).toBe("/produkte");
  });

  it("mappt Shopify-Produkt-URLs auf /produkte/:slug", () => {
    expect(resolveLegacyRedirect("/products/katzenhoehle")).toBe("/produkte/katzenhoehle");
    expect(resolveLegacyRedirect("/Products/Kratzbaum/")).toBe("/produkte/kratzbaum");
  });

  it("mappt Shopify-Collections auf /kollektionen/:slug", () => {
    expect(resolveLegacyRedirect("/collections/sommer")).toBe("/kollektionen/sommer");
  });

  it("mappt Shopify-Pages auf CMS-Pfade", () => {
    expect(resolveLegacyRedirect("/pages/ueber-uns")).toBe("/ueber-uns");
  });

  it("liefert null für unbekannte Pfade", () => {
    expect(resolveLegacyRedirect("/produkte/foo")).toBeNull();
    expect(resolveLegacyRedirect("/")).toBeNull();
  });
});
