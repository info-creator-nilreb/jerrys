import { describe, expect, it } from "vitest";
import {
  buildEmailVerifyOrderlyHtml,
  buildMagicLinkOrderlyHtml,
  buildPasswordResetOrderlyHtml,
} from "@/lib/email/templates/auth-email-orderly-html";
import {
  buildOrderCancelledOrderlyHtml,
  buildOrderRefundedOrderlyHtml,
  buildOrderShippedOrderlyHtml,
} from "@/lib/email/templates/order-transactional-orderly-html";
import {
  buildWorkshopBookingCancelledOrderlyHtml,
  buildWorkshopBookingConfirmationOrderlyHtml,
  buildWorkshopDateRequestApprovedOrderlyHtml,
  buildWorkshopDateRequestRejectedOrderlyHtml,
} from "@/lib/email/templates/workshop-email-orderly-html";
import { getEmailTemplateDefault } from "@/lib/email/templates/defaults";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/templates/catalog";

const ORDERLY_SHELL_MARKERS = ["{{{shop.logo_html}}}", "{{{shop.footer_html}}}"];

function expectOrderlyShell(html: string) {
  for (const marker of ORDERLY_SHELL_MARKERS) {
    expect(html).toContain(marker);
  }
  expect(html).toContain('width="600"');
}

describe("orderly email templates", () => {
  it("order_shipped enthält Orderly-Platzhalter", () => {
    const html = buildOrderShippedOrderlyHtml();
    expectOrderlyShell(html);
    expect(html).toContain("Deine Bestellung wurde versandt");
    expect(html).toContain("{{{order.invoice_note_html}}}");
    expect(html).toContain("{{{order.shipping_address_tracking_html}}}");
    expect(html).not.toContain("{{{order.tracking_section_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
  });

  it("order_cancelled enthält Orderly-Platzhalter", () => {
    const html = buildOrderCancelledOrderlyHtml();
    expectOrderlyShell(html);
    expect(html).toContain("Bestellung storniert");
    expect(html).toContain("{{order.cancelled_date}}");
    expect(html).toContain("{{{order.items_html}}}");
  });

  it("order_refunded enthält Orderly-Platzhalter", () => {
    const html = buildOrderRefundedOrderlyHtml();
    expectOrderlyShell(html);
    expect(html).toContain("Rückerstattung");
    expect(html).toContain("{{{order.refund_amount_row_html}}}");
    expect(html).toContain("{{{order.items_html}}}");
  });

  it("auth templates nutzen gemeinsame Auth-Action-Struktur", () => {
    for (const build of [
      buildEmailVerifyOrderlyHtml,
      buildMagicLinkOrderlyHtml,
      buildPasswordResetOrderlyHtml,
    ]) {
      const html = build();
      expectOrderlyShell(html);
      expect(html).toContain("{{{customer.greeting_html}}}");
      expect(html).toContain("{{{email.cta_html}}}");
      expect(html).toContain("{{{email.after_button_note_html}}}");
    }
  });

  it("workshop templates nutzen Orderly-Hülle und Details-Karte", () => {
    for (const build of [
      buildWorkshopBookingConfirmationOrderlyHtml,
      buildWorkshopBookingCancelledOrderlyHtml,
      buildWorkshopDateRequestApprovedOrderlyHtml,
      buildWorkshopDateRequestRejectedOrderlyHtml,
    ]) {
      const html = build();
      expectOrderlyShell(html);
      expect(html).toContain("{{{workshop.details_html}}}");
      expect(html).toContain("{{{email.cta_html}}}");
    }
  });

  it("alle Template-Defaults nutzen Orderly-HTML", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const d = getEmailTemplateDefault(key);
      expectOrderlyShell(d.htmlBody);
      expect(d.subject.length).toBeGreaterThan(0);
      expect(d.textBody.length).toBeGreaterThan(0);
    }
  });
});
