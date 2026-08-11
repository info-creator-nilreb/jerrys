import { describe, expect, it } from "vitest";
import { CONTENT_BLOCK_REGISTRY } from "@/components/content/block-registry";
import {
  listRegisteredContentBlockTypes,
  parseContentBlockData,
  resolveContentBlockSchema,
} from "@/lib/content/block-schemas";
import { CONTENT_BLOCK_TYPES } from "@/lib/content/block-types";
import { sanitizeContentRichTextHtml } from "@/lib/content/sanitize-content-html";

describe("CONTENT_BLOCK_REGISTRY", () => {
  it("registriert genau die v1-Block-Typen", () => {
    expect(listRegisteredContentBlockTypes()).toEqual([...CONTENT_BLOCK_TYPES]);
    for (const type of CONTENT_BLOCK_TYPES) {
      expect(CONTENT_BLOCK_REGISTRY[type]).toBeDefined();
      expect(CONTENT_BLOCK_REGISTRY[type].schema).toBeDefined();
      expect(CONTENT_BLOCK_REGISTRY[type].Component).toBeDefined();
    }
  });

  it("resolveContentBlockSchema für unbekannte Typen", () => {
    expect(resolveContentBlockSchema("customHtml")).toBeNull();
    expect(resolveContentBlockSchema("hero")).not.toBeNull();
  });
});

describe("parseContentBlockData", () => {
  it("parst gültigen Hero", () => {
    const r = parseContentBlockData("hero", {
      headline: "Hallo",
      imageUrl: "/media/hero-mood.jpg",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ headline: "Hallo" });
    }
  });

  it("lehnt ungültigen Hero ab", () => {
    const r = parseContentBlockData("hero", { headline: "", imageUrl: "ftp://x" });
    expect(r.ok).toBe(false);
  });

  it("parst FAQ und USP", () => {
    expect(
      parseContentBlockData("faq", {
        items: [{ question: "Q?", answer: "A." }],
      }).ok,
    ).toBe(true);
    expect(
      parseContentBlockData("uspStrip", {
        items: [
          { icon: "design", title: "T", body: "B" },
          { icon: "germany", title: "T2", body: "B2" },
        ],
      }).ok,
    ).toBe(true);
  });

  it("parst socialReviews mit Defaults für Feed-Quelle", () => {
    const r = parseContentBlockData("socialReviews", {
      showReviews: true,
      showSocial: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({
        socialSource: "auto",
        socialLimit: 12,
      });
    }
  });

  it("parst workshopCalendar mit Defaults und lehnt ungültiges Limit ab", () => {
    const ok = parseContentBlockData("workshopCalendar", {});
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data).toMatchObject({
        showHeader: true,
        limit: 12,
        showDateRequestLink: true,
      });
    }

    const withTitle = parseContentBlockData("workshopCalendar", {
      title: "Workshops",
      intro: "Bald",
      limit: 8,
      showDateRequestLink: false,
    });
    expect(withTitle.ok).toBe(true);
    if (withTitle.ok) {
      expect(withTitle.data).toMatchObject({
        title: "Workshops",
        intro: "Bald",
        limit: 8,
        showDateRequestLink: false,
      });
    }

    expect(parseContentBlockData("workshopCalendar", { limit: 0 }).ok).toBe(false);
    expect(parseContentBlockData("workshopCalendar", { limit: 99 }).ok).toBe(false);
  });
});

describe("sanitizeContentRichTextHtml", () => {
  it("entfernt Script und behält erlaubte Tags", () => {
    const clean = sanitizeContentRichTextHtml(
      '<p>Hi</p><script>alert(1)</script><a href="https://example.com">x</a>',
    );
    expect(clean).toContain("<p>Hi</p>");
    expect(clean).toContain("https://example.com");
    expect(clean).not.toContain("script");
  });

  it("behält Ausrichtung und Schriftgröße, entfernt andere Styles", () => {
    const clean = sanitizeContentRichTextHtml(
      '<p style="text-align: center; color: red"><span style="font-size: 1.25rem; background: yellow">Hi</span></p>',
    );
    expect(clean).toContain("text-align:center");
    expect(clean).toContain("font-size:1.25rem");
    expect(clean).not.toContain("color");
    expect(clean).not.toContain("background");
  });
});
