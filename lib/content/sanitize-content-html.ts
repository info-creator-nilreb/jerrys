import DOMPurify from "isomorphic-dompurify";

/**
 * Rich-Text für CMS-Blöcke (enger als Rechtstexte, ohne style).
 * Nie ungesäubertes HTML rendern.
 */
export function sanitizeContentRichTextHtml(
  dirty: string | null | undefined,
): string | null {
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
      "ul",
      "ol",
      "li",
      "a",
      "h2",
      "h3",
      "h4",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return clean.trim() === "" ? null : clean;
}
