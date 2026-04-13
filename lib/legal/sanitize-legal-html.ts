import DOMPurify from "isomorphic-dompurify";

/** CMS-Export der Rechtstexte: erlaubt gängige Tags inkl. Inline-Styles. */
export function sanitizeLegalDocumentHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: ["href", "target", "rel", "style", "face", "color", "colspan", "rowspan", "align"],
  });
}
