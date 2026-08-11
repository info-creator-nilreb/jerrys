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
  },
): string {
  return sanitizeHtml(dirty, {
    allowedTags: options.allowedTags,
    allowedAttributes: options.allowedAttributes,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}
