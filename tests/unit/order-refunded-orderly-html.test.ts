import { describe, expect, it } from "vitest";
import { orderRefundAmountRowHtml } from "@/lib/email/templates/order-fragments";
import { buildOrderRefundedOrderlyHtml } from "@/lib/email/templates/order-refunded-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";

describe("order refunded orderly html", () => {
  it("enthält Orderly-Struktur und alle Pflicht-Platzhalter", () => {
    const html = buildOrderRefundedOrderlyHtml();
    expect(html).toContain("Rückerstattung");
    expect(html).toContain("{{{shop.logo_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
    expect(html).toContain("{{{order.refund_amount_row_html}}}");
    expect(html).toContain("{{{shop.footer_html}}}");
    expect(html).toContain("Bestell-Nr. {{order.number}}");
    expect(html).toContain("{{order.refund_date}}");
    expect(html).toContain("Artikel, für die der Kaufpreis erstattet wurde");
    expect(html).toContain("Bank- oder Kreditkartenauszügen");
    expect(html).toContain("Viele Grüße");
    expect(html).toContain("Dein {{shop.name}}-Team");
  });

  it("rendert Rückerstattungsbetrag-Zeile", () => {
    const row = orderRefundAmountRowHtml("54,80 €");
    expect(row).toContain("Rückerstattungsbetrag");
    expect(row).toContain("54,80 €");
  });

  it("ist Default für order_refunded", () => {
    const d = getEmailTemplateDefault("order_refunded");
    expect(d.htmlBody).toContain("Rückerstattung");
    expect(d.htmlBody).toContain("{{{order.refund_amount_row_html}}}");
    expect(d.textBody).toContain("Dein {{shop.name}}-Team");
  });
});
