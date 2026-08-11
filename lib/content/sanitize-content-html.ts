import { sanitizeAllowedHtml } from "@/lib/security/sanitize-html";

/**
 * Rich-Text für CMS-Blöcke (enger als Rechtstexte, ohne style).
 * Nie ungesäubertes HTML rendern.
 */
export function sanitizeContentRichTextHtml(
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
      "ul",
      "ol",
      "li",
      "a",
      "h2",
      "h3",
      "h4",
      "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
  });
  return clean.trim() === "" ? null : clean;
}
