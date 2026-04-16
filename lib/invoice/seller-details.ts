import { loadLegalHtmlRaw } from "@/lib/legal/load-legal-html";
import { htmlToInvoicePlainFooter } from "@/lib/invoice/legal-plain-text";

export type InvoiceSellerDetails = {
  lines: string[];
  ustId?: string;
  steuernummer?: string;
};

/**
 * Ausgangsrechnung: Aussteller aus Env oder Fallback Impressum-Text.
 */
export function getInvoiceSellerDetails(): InvoiceSellerDetails {
  const name = process.env.INVOICE_SELLER_NAME?.trim();
  const addr = process.env.INVOICE_SELLER_ADDRESS?.trim();
  const ustId = process.env.INVOICE_UST_ID?.trim();
  const steuernummer = process.env.INVOICE_STEUERNR?.trim();

  if (name && addr) {
    return {
      lines: [name, ...addr.split("\n").map((l) => l.trim()).filter(Boolean)],
      ustId: ustId || undefined,
      steuernummer: steuernummer || undefined,
    };
  }

  try {
    const html = loadLegalHtmlRaw("impressum");
    const plain = htmlToInvoicePlainFooter(html);
    const lines = plain
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 12);
    return { lines: lines.length ? lines : ["jerry's"] };
  } catch {
    return { lines: ["jerry's"] };
  }
}
