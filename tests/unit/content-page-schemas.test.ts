import { describe, expect, it } from "vitest";
import {
  parseContentBlockShell,
  parseContentPageValues,
} from "@/lib/content/content-page-schemas";
import {
  CONTENT_PAGE_HOME_SLUG,
  isReservedContentSlug,
  normalizeContentSlug,
  publicPathForContentSlug,
} from "@/lib/content/reserved-slugs";

describe("reserved content slugs", () => {
  it("erkennt Systempfade", () => {
    expect(isReservedContentSlug("admin")).toBe(true);
    expect(isReservedContentSlug("/Checkout")).toBe(true);
    expect(isReservedContentSlug("produkte")).toBe(true);
    expect(isReservedContentSlug("vorschau")).toBe(true);
    expect(isReservedContentSlug("impressum")).toBe(false);
    expect(isReservedContentSlug(CONTENT_PAGE_HOME_SLUG)).toBe(false);
  });

  it("normalisiert und mappt öffentliche Pfade", () => {
    expect(normalizeContentSlug(" /Impressum/ ")).toBe("impressum");
    expect(publicPathForContentSlug("home")).toBe("/");
    expect(publicPathForContentSlug("datenschutz")).toBe("/datenschutz");
  });
});

describe("parseContentPageValues", () => {
  it("akzeptiert Content-Seite", () => {
    const r = parseContentPageValues({
      slug: "impressum",
      pageType: "legal",
      status: "draft",
      title: "Impressum",
      seoTitle: "",
      seoDescription: null,
      ogImageUrl: null,
      canonicalPath: "/impressum",
      robotsIndex: true,
      previousSlug: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.slug).toBe("impressum");
      expect(r.data.seoTitle).toBeNull();
      expect(r.data.previousSlug).toBeNull();
      expect(r.data.showInFooter).toBe(false);
    }
  });

  it("erzwingt home-Slug für homepage", () => {
    const bad = parseContentPageValues({
      slug: "start",
      pageType: "homepage",
      title: "Start",
    });
    expect(bad.success).toBe(false);

    const ok = parseContentPageValues({
      slug: "home",
      pageType: "homepage",
      title: "Startseite",
    });
    expect(ok.success).toBe(true);
  });

  it("lehnt reservierte Slugs ab", () => {
    const r = parseContentPageValues({
      slug: "checkout",
      pageType: "content",
      title: "Nope",
    });
    expect(r.success).toBe(false);
  });
});

describe("parseContentBlockShell", () => {
  it("akzeptiert bekannte Typen", () => {
    const r = parseContentBlockShell({
      type: "hero",
      sortOrder: 0,
      data: { headline: "Hallo" },
    });
    expect(r.success).toBe(true);
  });

  it("lehnt unbekannte Typen ab", () => {
    const r = parseContentBlockShell({ type: "customHtml", data: {} });
    expect(r.success).toBe(false);
  });
});
