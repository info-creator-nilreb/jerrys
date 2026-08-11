import {
  RICH_TEXT_ALLOWED_STYLES,
  sanitizeAllowedHtml,
} from "@/lib/security/sanitize-html";

/**
 * Rich-Text für CMS-Blöcke (enger als Rechtstexte).
 * Erlaubt kompakte Shopify-ähnliche Formatierung: Fett, Kursiv, Unterstrichen,
 * Ausrichtung, Schriftgröße. Nie ungesäubertes HTML rendern.
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
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      span: ["style"],
    },
    allowedStyles: RICH_TEXT_ALLOWED_STYLES,
  });
  return clean.trim() === "" ? null : clean;
}
