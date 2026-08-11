import { sanitizeAllowedHtml } from "@/lib/security/sanitize-html";

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
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
  });
  return clean.trim() === "" ? null : clean;
}
