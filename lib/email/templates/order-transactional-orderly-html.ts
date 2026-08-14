import {
  buildOrderlyEmailHtml,
  orderlyClosing,
  orderlyCtaBlock,
  orderlyDivider,
  orderlyHeading,
  orderlyIntro,
  orderlyItemsSection,
  orderlyOrderNumber,
  orderlySection,
} from "@/lib/email/templates/orderly-email-shell";

export function buildOrderShippedOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Versand {{order.number}}",
    previewText:
      "Wir freuen uns, dir mitteilen zu können, dass deine Bestellung {{order.number}} versandt wurde!",
    bodyHtml: [
      orderlyHeading("Deine Bestellung wurde versandt"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">wir freuen uns, dir mitteilen zu können, dass deine Bestellung versandt wurde!</p>`,
      ),
      orderlySection("{{{order.invoice_note_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlyOrderNumber(),
      orderlyItemsSection("Versandte Artikel", "{{{order.items_html}}}"),
      orderlySection("{{{order.shipping_address_tracking_html}}}", "11px 44px"),
      orderlyDivider(),
      orderlySection("{{{order.tracking_section_html}}}", "11px 44px"),
      orderlyClosing(),
    ].join(""),
  });
}

export function buildOrderCancelledOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Storno {{order.number}}",
    previewText: "Hiermit bestätigen wir dir, dass deine Bestellung {{order.number}} storniert wurde.",
    bodyHtml: [
      orderlyHeading("Bestellung storniert"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">hiermit bestätigen wir dir, dass deine Bestellung storniert wurde.</p>`,
      ),
      orderlyDivider(),
      orderlyOrderNumber("Bestell-Nr. {{order.number}}", "{{order.cancelled_date}}"),
      orderlyItemsSection("Stornierte Artikel", "{{{order.items_html}}}"),
      orderlyDivider(),
      orderlyClosing(),
    ].join(""),
  });
}

export function buildOrderRefundedOrderlyHtml(): string {
  return buildOrderlyEmailHtml({
    documentTitle: "Erstattung {{order.number}}",
    previewText:
      "Wir haben dir deine Bestellung {{order.number}} erstattet. Bitte beachte, dass es einige Tage dauern kann, bis die Erstattung auf deinen Kontoauszügen erscheint.",
    bodyHtml: [
      orderlyHeading("Rückerstattung"),
      orderlyIntro(
        `<p style="margin:0 0 11px;">Hallo {{customer.first_name}},</p><p style="margin:0;">wir haben dir deine Bestellung erstattet. Bitte beachte, dass es einige Tage dauern kann, bis die Erstattung auf deinen Bank- oder Kreditkartenauszügen erscheint.</p>`,
      ),
      orderlyDivider(),
      orderlyOrderNumber("Bestell-Nr. {{order.number}}", "{{order.refund_date}}"),
      orderlyItemsSection(
        "Artikel, für die der Kaufpreis erstattet wurde",
        "{{{order.items_html}}}",
        "{{{order.refund_amount_row_html}}}",
      ),
      orderlyDivider(),
      orderlyClosing(),
    ].join(""),
  });
}
