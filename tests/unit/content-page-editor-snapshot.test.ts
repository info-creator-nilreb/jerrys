import { describe, expect, it } from "vitest";
import { buildContentPageEditorSnapshot } from "@/lib/content/content-page-editor-snapshot";

describe("buildContentPageEditorSnapshot", () => {
  const base = {
    title: "Startseite",
    pageType: "homepage",
    slug: "home",
    status: "published",
    seoTitle: "",
    seoDescription: "",
    ogImageUrl: "",
    canonicalPath: "",
    robotsIndex: true,
    showInFooter: false,
    blocksJson: "[]",
  };

  it("ist stabil bei Trim und gleicher Reihenfolge", () => {
    const a = buildContentPageEditorSnapshot(base);
    const b = buildContentPageEditorSnapshot({
      ...base,
      title: "  Startseite  ",
      seoTitle: "  ",
    });
    expect(a).toBe(b);
  });

  it("ändert sich bei Block- oder Titeländerung", () => {
    const a = buildContentPageEditorSnapshot(base);
    const b = buildContentPageEditorSnapshot({
      ...base,
      title: "Anders",
    });
    const c = buildContentPageEditorSnapshot({
      ...base,
      blocksJson: '[{"type":"hero"}]',
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
