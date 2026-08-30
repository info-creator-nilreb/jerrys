import { describe, expect, it } from "vitest";
import {
  isInternalStorefrontNavigationHref,
  storefrontNavigationTarget,
} from "@/lib/storefront/navigation-progress";

const ORIGIN = "https://shop.example";

describe("isInternalStorefrontNavigationHref", () => {
  it("erkennt interne Pfade", () => {
    expect(isInternalStorefrontNavigationHref("/produkte/foo", ORIGIN)).toBe(true);
    expect(isInternalStorefrontNavigationHref("/kategorien/hund?sort=preis", ORIGIN)).toBe(true);
    expect(isInternalStorefrontNavigationHref(`${ORIGIN}/warenkorb`, ORIGIN)).toBe(true);
  });

  it("lehnt Anker, externe Links und Spezial-URLs ab", () => {
    expect(isInternalStorefrontNavigationHref("#main", ORIGIN)).toBe(false);
    expect(isInternalStorefrontNavigationHref("mailto:hi@example.com", ORIGIN)).toBe(false);
    expect(isInternalStorefrontNavigationHref("https://other.example/p", ORIGIN)).toBe(false);
    expect(
      isInternalStorefrontNavigationHref("/produkte/foo", ORIGIN, { target: "_blank" }),
    ).toBe(false);
  });
});

describe("storefrontNavigationTarget", () => {
  it("normalisiert Pfad und Query", () => {
    expect(storefrontNavigationTarget("/produkte/foo", ORIGIN)).toBe("/produkte/foo");
    expect(storefrontNavigationTarget("/kategorien/hund?sort=preis", ORIGIN)).toBe(
      "/kategorien/hund?sort=preis",
    );
  });
});
