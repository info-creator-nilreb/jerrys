import { describe, expect, it } from "vitest";
import {
  buildCmsLinkTargetOptions,
  CMS_LINK_TARGET_CUSTOM_VALUE,
  CMS_LINK_TARGET_EXTERNAL_VALUE,
  resolveCmsLinkTargetSelectValue,
} from "@/lib/content/cms-link-target-options";

describe("cms-link-target-options", () => {
  it("baut Pfade für Seiten, Kollektionen, Kategorien und Produkte", () => {
    const options = buildCmsLinkTargetOptions({
      pages: [{ slug: "ueber-uns", title: "Über uns" }],
      collections: [{ slug: "neu", title: "Neuheiten" }],
      categories: [{ slug: "hunde", title: "Hunde" }],
      products: [{ slug: "napf", title: "Futternapf" }],
    });

    expect(options.some((o) => o.href === "/ueber-uns" && o.group === "page")).toBe(true);
    expect(options.some((o) => o.href === "/kollektionen/neu")).toBe(true);
    expect(options.some((o) => o.href === "/kategorien/hunde")).toBe(true);
    expect(options.some((o) => o.href === "/produkte/napf")).toBe(true);
    expect(options.some((o) => o.href === "/produkte" && o.group === "system")).toBe(true);
  });

  it("resolveCmsLinkTargetSelectValue erkennt bekannte und freie Pfade", () => {
    const options = buildCmsLinkTargetOptions({
      pages: [{ slug: "home", title: "Start" }],
      collections: [],
      categories: [],
      products: [],
    });

    expect(resolveCmsLinkTargetSelectValue("/", options)).toBe("/");
    expect(resolveCmsLinkTargetSelectValue("/sonderseite", options)).toBe(
      CMS_LINK_TARGET_CUSTOM_VALUE,
    );
    expect(
      resolveCmsLinkTargetSelectValue("https://maps.example", options, {
        allowExternal: true,
      }),
    ).toBe(CMS_LINK_TARGET_EXTERNAL_VALUE);
  });
});

describe("resolveHeroCtaSelectValue", () => {
  it("bleibt kompatibel zu System-Presets", async () => {
    const { resolveHeroCtaSelectValue } = await import("@/lib/content/hero-cta-targets");
    expect(resolveHeroCtaSelectValue("/produkte")).toBe("/produkte");
    expect(resolveHeroCtaSelectValue("/eigene-seite")).toBe(CMS_LINK_TARGET_CUSTOM_VALUE);
  });
});
