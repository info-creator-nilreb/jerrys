import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";
import { htmlToInvoicePlainFooter } from "@/lib/invoice/legal-plain-text";

/**
 * Entfernt Abschnitte, die auf der Rechnung nicht erscheinen sollen (vgl. Web-Impressum).
 */
export function stripInvoiceImpressumHtml(html: string): string {
  return html
    .replace(/<h2[^>]*>[\s\S]*?<\/h2>\s*<hr\s*\/?>/i, "")
    .replace(/<p><strong><span>jerry-s\.com wird betrieben durch:<\/span><\/strong><\/p>/i, "")
    .replace(/<p>Inhaltlich Verantwortlicher[\s\S]*?<\/p>/i, "")
    .replace(/<p><strong>Haftungsausschluss<\/strong><\/p>\s*<p>[\s\S]*?<\/p>/i, "");
}

export function loadInvoiceImpressumFooterPlain(): string {
  try {
    const raw = loadLegalHtmlRaw("impressum");
    return htmlToInvoicePlainFooter(stripInvoiceImpressumHtml(raw));
  } catch {
    return "";
  }
}
