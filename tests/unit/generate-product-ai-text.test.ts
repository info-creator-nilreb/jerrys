import { describe, expect, it } from "vitest";
import {
  normalizeAiBulletsForProductField,
  plainTextToProductDescriptionHtml,
  productFieldForAiTextKind,
} from "@/features/integrations";

describe("productFieldForAiTextKind", () => {
  it("mappt übernehmbare Textarten auf Formularfelder", () => {
    expect(productFieldForAiTextKind("short_description")).toBe("leadText");
    expect(productFieldForAiTextKind("long_description")).toBe("descriptionHtml");
    expect(productFieldForAiTextKind("bullets")).toBe("featureBullets");
    expect(productFieldForAiTextKind("seo_title")).toBeNull();
    expect(productFieldForAiTextKind("alt_text")).toBeNull();
    expect(productFieldForAiTextKind("cms_hero_headline")).toBeNull();
    expect(productFieldForAiTextKind("cms_rich_text")).toBeNull();
  });
});

describe("plainTextToProductDescriptionHtml", () => {
  it("wandelt Absätze in <p> um", () => {
    const html = plainTextToProductDescriptionHtml("Eins\n\nZwei <drei>");
    expect(html).toContain("<p>Eins</p>");
    expect(html).toContain("<p>Zwei &lt;drei&gt;</p>");
  });
});

describe("normalizeAiBulletsForProductField", () => {
  it("entfernt führende Listenmarker", () => {
    expect(normalizeAiBulletsForProductField("- A\n* B\n• C\nD")).toBe("A\nB\nC\nD");
  });
});
