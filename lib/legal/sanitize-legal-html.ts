import { sanitizeAllowedHtml } from "@/lib/security/sanitize-html";

/** CMS-/Datei-Rechtstexte: gängige Tags inkl. begrenzter Inline-Styles. */
export function sanitizeLegalDocumentHtml(dirty: string): string {
  return sanitizeAllowedHtml(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "span",
      "font",
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
      span: ["style"],
      font: ["face", "color"],
      th: ["colspan", "rowspan", "align", "style"],
      td: ["colspan", "rowspan", "align", "style"],
      p: ["style", "align"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      table: ["style"],
    },
  });
}
