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
    expect(order.shipping_address_tracking_html).toContain("Sendung verfolgen");
    expect(order.shipping_address_tracking_html).toContain(
      "Bitte beachte, dass es eine Weile dauern kann, bis die Sendungsdaten aktualisiert werden.",
    );
    expect(order.shipping_address_tracking_html).not.toContain("Sendungsverfolgung");
    expect(order.items_html).toContain("Gin Tasting Set");
    expect(order.items_html).not.toBe("<table>…</table>");
    expect(order.shipping_address_tracking_html).toContain("Versandadresse");
  });

  it("nutzt für Erstattungsmail echtes Rückerstattungsbetrag-Fragment", () => {
    const vars = buildEmailTemplatePreviewVars(
      "order_refunded",
      defaultTransactionalEmailBranding(),
    );
    const order = vars.order as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Zurück zum Shop");
    expect(order.refund_amount_row_html).toContain("Rückerstattungsbetrag");
    expect(order.refund_amount_row_html).toContain("54,80");
    expect(order.refund_amount_row_html).not.toContain("…");
    expect(order.items_html).toContain("Gin Tasting Set");
  });

  it("nutzt für Terminbestätigung echte Details-Karte und CTA", () => {
    const vars = buildEmailTemplatePreviewVars(
      "workshop_booking_confirmation",
      defaultTransactionalEmailBranding(),
    );
    const workshop = vars.workshop as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Termin im Konto ansehen");
    expect(workshop.details_html).toContain("Gin Tasting");
    expect(workshop.details_html).toContain("jerry's Bar, Berlin");
    expect(workshop.details_html).toContain("2 Plätze");
    expect(workshop.details_html).not.toContain("…");
  });

  it("nutzt für Termin-Storno echte Details-Karte und CTA", () => {
    const vars = buildEmailTemplatePreviewVars(
      "workshop_booking_cancelled",
      defaultTransactionalEmailBranding(),
    );
    const workshop = vars.workshop as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Termine im Konto");
    expect(workshop.details_html).toContain("Gin Tasting");
    expect(workshop.details_html).toContain("jerry's Bar, Berlin");
    expect(workshop.details_html).not.toContain("…");
  });

  it("nutzt für Wunschtermin angenommen volle Wunschzeit und CTA", () => {
    const vars = buildEmailTemplatePreviewVars(
      "workshop_date_request_approved",
      defaultTransactionalEmailBranding(),
    );
    const workshop = vars.workshop as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Termine ansehen");
    expect(workshop.details_html).toContain("Wunschzeit:");
    expect(workshop.details_html).toContain("Sa., 20.09.2026, 18:00");
    expect(workshop.details_html).not.toContain("…");
  });

  it("nutzt für Wunschtermin abgelehnt volle Zeit und Admin-Hinweis", () => {
    const vars = buildEmailTemplatePreviewVars(
      "workshop_date_request_rejected",
      defaultTransactionalEmailBranding(),
    );
    const workshop = vars.workshop as Record<string, string>;
    const email = vars.email as Record<string, string>;

    expect(email.cta_label).toBe("Termine ansehen");
    expect(workshop.details_html).toContain("Angefragte Zeit:");
    expect(workshop.details_html).toContain("Sa., 20.09.2026, 18:00");
    expect(workshop.details_html).toContain("Leider keine Kapazität");
    expect(workshop.details_html).not.toContain("…");
  });
});
