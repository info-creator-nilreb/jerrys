import { describe, expect, it } from "vitest";
import { buildOrderCancelledOrderlyHtml } from "@/lib/email/templates/order-cancelled-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";

describe("order cancelled orderly html", () => {
  it("enthält Orderly-Struktur und alle Pflicht-Platzhalter", () => {
    const html = buildOrderCancelledOrderlyHtml();
    expect(html).toContain("Bestellung storniert");
    expect(html).toContain("{{{shop.logo_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
    expect(html).toContain("{{{shop.footer_html}}}");
    expect(html).toContain("Bestell-Nr. {{order.number}}");
    expect(html).toContain("{{order.cancelled_date}}");
    expect(html).toContain("Stornierte Artikel");
    expect(html).toContain("hiermit bestätigen wir dir");
    expect(html).toContain("Viele Grüße");
    expect(html).toContain("Dein {{shop.name}}-Team");
  });

  it("ist Default für order_cancelled", () => {
    const d = getEmailTemplateDefault("order_cancelled");
    expect(d.htmlBody).toContain("Bestellung storniert");
    expect(d.htmlBody).toContain("{{{order.items_html}}}");
    expect(d.textBody).toContain("Storniert am: {{order.cancelled_date}}");
    expect(d.textBody).toContain("Dein {{shop.name}}-Team");
  });
});
