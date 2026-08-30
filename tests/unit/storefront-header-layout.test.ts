import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("storefront header layout", () => {
  it("reserviert linke Header-Slot-Breite und hebt Steuerungen über das Logo", () => {
    const shell = readFileSync(
      path.resolve("components/storefront/site-header-shell.tsx"),
      "utf8",
    );
    const nav = readFileSync(
      path.resolve("components/storefront/storefront-shop-nav.tsx"),
      "utf8",
    );

    expect(shell).toContain("min-w-11 flex-1");
    expect(shell).toContain("pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto");
    expect(shell).toContain("z-[500001] flex justify-center");
    expect(shell).toContain("z-[500002]");
    expect(shell).toContain("shrink-0 items-center justify-end");
    expect(nav).toContain("relative z-[500001]");
  });
});
