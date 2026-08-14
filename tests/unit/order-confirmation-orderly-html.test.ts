import { describe, expect, it } from "vitest";
import { buildOrderConfirmationOrderlyHtml } from "@/lib/email/templates/order-confirmation-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";

describe("order confirmation orderly html", () => {
  it("enthält Orderly-Struktur und alle Pflicht-Platzhalter", () => {
    const html = buildOrderConfirmationOrderlyHtml();
    expect(html).toContain("Danke für deine Bestellung");
    expect(html).toContain("{{{shop.logo_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
    expect(html).toContain("{{{order.totals_html}}}");
    expect(html).toContain("{{{order.addresses_html}}}");
    expect(html).toContain("{{{email.cta_html}}}");
    expect(html).toContain("{{{shop.footer_html}}}");
    expect(html).toContain("Bestell-Nr. {{order.number}}");
    expect(html).not.toContain("{{{email.hero_icon_html}}}");
  });

  it("ist Default für order_confirmation", () => {
    const d = getEmailTemplateDefault("order_confirmation");
    expect(d.htmlBody).toContain("Danke für deine Bestellung");
    expect(d.htmlBody).toContain("{{{order.addresses_html}}}");
  });
});
