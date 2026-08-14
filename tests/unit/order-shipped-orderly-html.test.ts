import { describe, expect, it } from "vitest";
import { buildOrderShippedOrderlyHtml } from "@/lib/email/templates/order-shipped-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";

describe("order shipped orderly html", () => {
  it("enthält Orderly-Struktur und alle Pflicht-Platzhalter", () => {
    const html = buildOrderShippedOrderlyHtml();
    expect(html).toContain("Deine Bestellung wurde versandt");
    expect(html).toContain("{{{shop.logo_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
    expect(html).toContain("{{{order.invoice_note_html}}}");
    expect(html).toContain("{{{order.shipping_address_tracking_html}}}");
    expect(html).toContain("{{{order.tracking_section_html}}}");
    expect(html).toContain("{{{shop.footer_html}}}");
    expect(html).toContain("Bestell-Nr. {{order.number}}");
    expect(html).toContain("Versandte Artikel");
    expect(html).toContain("Viele Grüße");
    expect(html).toContain("Dein {{shop.name}}-Team");
  });

  it("ist Default für order_shipped", () => {
    const d = getEmailTemplateDefault("order_shipped");
    expect(d.htmlBody).toContain("Deine Bestellung wurde versandt");
    expect(d.htmlBody).toContain("{{{order.shipping_address_tracking_html}}}");
    expect(d.textBody).toContain("Viele Grüße");
    expect(d.textBody).toContain("Dein {{shop.name}}-Team");
  });
});
