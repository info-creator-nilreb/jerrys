import {
  RICH_TEXT_ALLOWED_STYLES,
  sanitizeAllowedHtml,
} from "@/lib/security/sanitize-html";

/** Erlaubt einfache Rich-Text-Tags für Produktbeschreibungen. */
export function sanitizeProductDescriptionHtml(
  dirty: string | null | undefined,
): string | null {
  if (dirty == null || dirty.trim() === "") return null;
  const clean = sanitizeAllowedHtml(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "sub",
      "sup",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      span: ["style"],
    },
    allowedStyles: RICH_TEXT_ALLOWED_STYLES,
  });
  return clean.trim() === "" ? null : clean;
}
