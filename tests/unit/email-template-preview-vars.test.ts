import { describe, expect, it } from "vitest";
import { buildEmailTemplatePreviewVars } from "@/lib/email/templates/preview-vars";
import { defaultTransactionalEmailBranding } from "@/lib/shop/email-branding";

describe("buildEmailTemplatePreviewVars", () => {
  it("nutzt für Konto-Mails echte Fragmente statt Katalog-Kurzbeispiele", () => {
    const vars = buildEmailTemplatePreviewVars(
      "email_verify",
      defaultTransactionalEmailBranding(),
    );
    const email = vars.email as Record<string, string>;
    const customer = vars.customer as Record<string, string>;

    expect(email.cta_label).toBe("E-Mail bestätigen");
    expect(email.after_button_note_html).toContain(
      "Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.",
    );
    expect(email.after_button_note_html).toContain("color:#cccccc");
    expect(email.after_button_note_html).not.toContain("…");
    expect(customer.greeting_html).toContain("Hallo Alex,");
    expect(customer.greeting_html).toContain("color:#777777");
  });

  it("nutzt für Versandmail echte Fragmente für Rechnung und Tracking", () => {
    const vars = buildEmailTemplatePreviewVars(
      "order_shipped",
      defaultTransactionalEmailBranding(),
    );
    const order = vars.order as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Zur Bestellung");
    expect(order.invoice_note_html).toContain("Rechnungsnummer RE-2026-0042");
    expect(order.invoice_note_html).toContain("PDF-Anhang");
    expect(order.invoice_note_html).toContain("color:#777777");
    expect(order.tracking_section_html).toContain(
      "Du kannst den Status deiner Lieferung verfolgen:",
    );
    expect(order.tracking_section_html).not.toContain("…");
    expect(order.items_html).toContain("Gin Tasting Set");
    expect(order.items_html).not.toBe("<table>…</table>");
    expect(order.shipping_address_tracking_html).toContain("Versandadresse");
  });
});
