import { describe, expect, it } from "vitest";
import { defaultDataForContentBlockType } from "@/lib/content/block-defaults";
import { CONTENT_BLOCK_TYPES } from "@/lib/content/block-types";
import { parseBlocksJson } from "@/lib/content/update-content-page";

describe("defaultDataForContentBlockType", () => {
  it("liefert Defaults für alle Typen", () => {
    for (const type of CONTENT_BLOCK_TYPES) {
      const data = defaultDataForContentBlockType(type);
      expect(data).toBeTypeOf("object");
      const parsed = parseBlocksJson([{ type, data }]);
      expect(parsed.ok).toBe(true);
    }
  });
});

describe("parseBlocksJson", () => {
  it("parst und sanitisiert richText", () => {
    const r = parseBlocksJson([
      {
        type: "richText",
        data: { html: '<p>Hi</p><script>alert(1)</script>' },
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const html = (r.blocks[0]!.data as { html: string }).html;
      expect(html).toContain("<p>Hi</p>");
      expect(html).not.toContain("script");
    }
  });

  it("lehnt unbekannte Typen ab", () => {
    const r = parseBlocksJson([{ type: "evil", data: {} }]);
    expect(r.ok).toBe(false);
  });
});
