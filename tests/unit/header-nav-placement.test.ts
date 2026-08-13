import { describe, expect, it } from "vitest";
import {
  isHeaderNavPlacement,
  parseHeaderNavPlacement,
} from "@/lib/shop/shop-settings-defaults";
import {
  storefrontHeaderHeightCssVars,
  storefrontHeaderHeightCssVarsNavUnder,
  storefrontHeaderHeightVarsForNav,
} from "@/lib/storefront/page-below-header-padding";

describe("headerNavPlacement", () => {
  it("akzeptiert bekannte Positionen", () => {
    expect(isHeaderNavPlacement("beside")).toBe(true);
    expect(isHeaderNavPlacement("under")).toBe(true);
  });

  it("fällt bei Ungültigem auf beside zurück", () => {
    expect(parseHeaderNavPlacement("nope")).toBe("beside");
    expect(parseHeaderNavPlacement(null)).toBe("beside");
    expect(parseHeaderNavPlacement("under")).toBe("under");
  });

  it("wählt höhere Header-CSS-Vars nur bei inline + under", () => {
    expect(
      storefrontHeaderHeightVarsForNav({
        desktopMode: "inline",
        navPlacement: "under",
      }),
    ).toBe(storefrontHeaderHeightCssVarsNavUnder);
    expect(
      storefrontHeaderHeightVarsForNav({
        desktopMode: "inline",
        navPlacement: "beside",
      }),
    ).toBe(storefrontHeaderHeightCssVars);
    expect(
      storefrontHeaderHeightVarsForNav({
        desktopMode: "burger",
        navPlacement: "under",
      }),
    ).toBe(storefrontHeaderHeightCssVars);
  });
});
