import sanitizeHtml from "sanitize-html";

/**
 * Server- und Client-taugliche HTML-Sanitization ohne jsdom
 * (vermeidet Vercel/Turbopack ERR_REQUIRE_ESM mit isomorphic-dompurify).
 */
export function sanitizeAllowedHtml(
  dirty: string,
  options: {
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
    /** Eng gefasste Inline-Styles (z. B. text-align, font-size). */
    allowedStyles?: Record<string, Record<string, RegExp[]>>;
  },
): string {
  return sanitizeHtml(dirty, {
    allowedTags: options.allowedTags,
    allowedAttributes: options.allowedAttributes,
    allowedStyles: options.allowedStyles,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}

/** Erlaubte Styles für Admin-Rich-Text (Ausrichtung + Schriftgröße). */
export const RICH_TEXT_ALLOWED_STYLES: Record<
  string,
  Record<string, RegExp[]>
> = {
  "*": {
    "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    "font-size": [/^\d+(\.\d+)?(px|rem|em)$/],
  },
};
