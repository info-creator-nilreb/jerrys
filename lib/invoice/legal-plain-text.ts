/**
 * Reduziert Impressum-HTML auf Fließtext für PDF-Fußzeilen (kein vollständiges Layout).
 */
export function htmlToInvoicePlainFooter(html: string): string {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const asText = noStyle
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return asText
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
