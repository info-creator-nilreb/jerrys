import DOMPurify from "isomorphic-dompurify";

/** Erlaubt einfache Rich-Text-Tags für Produktbeschreibungen. */
export function sanitizeProductDescriptionHtml(dirty: string | null | undefined): string | null {
  if (dirty == null || dirty.trim() === "") return null;
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: ["href", "target", "rel", "colspan", "rowspan"],
  });
  return clean.trim() === "" ? null : clean;
}
