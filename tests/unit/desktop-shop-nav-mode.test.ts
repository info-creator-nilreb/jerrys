import { describe, expect, it } from "vitest";
import {
  isDesktopShopNavMode,
  parseDesktopShopNavMode,
} from "@/lib/shop/shop-settings-defaults";

describe("desktopShopNavMode", () => {
  it("akzeptiert bekannte Modi", () => {
    expect(isDesktopShopNavMode("hidden")).toBe(true);
    expect(isDesktopShopNavMode("inline")).toBe(true);
    expect(isDesktopShopNavMode("burger")).toBe(true);
  });

  it("fällt bei Ungültigem auf inline zurück", () => {
    expect(parseDesktopShopNavMode("nope")).toBe("inline");
    expect(parseDesktopShopNavMode(null)).toBe("inline");
    expect(parseDesktopShopNavMode("burger")).toBe("burger");
  });
});
