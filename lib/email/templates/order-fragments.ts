import { formatPrice } from "@/lib/catalog/format";
import {
  buildOrderItemsTableHtml,
  grayInfoCard,
  tintedCard,
  TRANSACTIONAL_EMAIL_DESIGN,
  type OrderLineItemForEmail,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";

const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;

export function orderNumberCardHtml(orderNumber: string): string {
  return grayInfoCard(
    `<strong style="font-size:13px;letter-spacing:0.02em;color:${textMuted}">Bestellnummer</strong><br/><span style="font-size:17px;font-weight:700;color:#1f2937">#${escapeHtmlForEmail(orderNumber)}</span>`,
  );
}

export function orderTotalsHtml(input: {
  subtotal: string;
  shipping: string;
  total: string;
  paymentMethod: string;
  shippingLabel?: string;
}): string {
  const sub = escapeHtmlForEmail(input.subtotal);
  const ship = escapeHtmlForEmail(input.shipping);
  const tot = escapeHtmlForEmail(input.total);
  const pm = escapeHtmlForEmail(input.paymentMethod);
  const shipLabel = escapeHtmlForEmail(input.shippingLabel ?? "Versand");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333"><tr><td style="padding:6px 0;border-top:2px solid ${divider}">Zwischensumme</td><td style="padding:6px 0;border-top:2px solid ${divider};text-align:right;font-weight:600;color:#1f2937">${sub}</td></tr><tr><td style="padding:6px 0;border-bottom:1px solid ${divider}">${shipLabel}</td><td style="padding:6px 0;border-bottom:1px solid ${divider};text-align:right;font-weight:600;color:#1f2937">${ship}</td></tr><tr><td style="padding:10px 0 6px;font-weight:700;font-size:15px;color:#1f2937">Gesamt</td><td style="padding:10px 0 6px;text-align:right;font-weight:700;font-size:16px;color:#1f2937">${tot}</td></tr><tr><td colspan="2" style="padding:4px 0 0;font-size:13px;color:${textMuted}">inkl. MwSt. · Zahlungsart: ${pm}</td></tr></table>`;
}

export function orderItemsHtml(items: OrderLineItemForEmail[]): string {
  return buildOrderItemsTableHtml(items, formatPrice);
}

export function orderItemsText(
  items: Array<{
    productTitleSnapshot: string;
    quantity: number;
    lineTotalGrossCents: number;
    currency: string;
    taxRatePercentSnapshot?: number;
  }>,
): string {
  return items
    .map((i) => {
      const tax =
        i.taxRatePercentSnapshot != null
          ? ` (inkl. ${i.taxRatePercentSnapshot}% MwSt.)`
          : "";
      return `- ${i.productTitleSnapshot} × ${i.quantity}: ${formatPrice(i.lineTotalGrossCents, i.currency)}${tax}`;
    })
    .join("\n");
}

export function refundAmountCardHtml(amountLabel: string): string {
  const refundAmt = escapeHtmlForEmail(amountLabel);
  return tintedCard(
    "#ffffff",
    `<strong style="font-size:13px;color:${textMuted}">Erstattungsbetrag</strong><br/><span style="font-size:20px;font-weight:700;color:#1f2937">${refundAmt}</span>`,
  );
}

export function refundMetaHtml(refundDate: string, paymentLabel: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6"><tr><td><strong style="color:#1f2937">Erstattet am</strong> ${escapeHtmlForEmail(refundDate)}</td></tr><tr><td style="padding-top:6px"><strong style="color:#1f2937">Zahlungsmethode</strong> ${escapeHtmlForEmail(paymentLabel)}</td></tr></table>`;
}

export function shippingDetailsHtml(input: {
  carrierLine: string | null;
  trackUrl: string | null;
  invoiceNumber: string | null;
  invoiceAttached: boolean;
  primaryColor: string;
}): string {
  let shipHtml = "";
  if (input.carrierLine) {
    shipHtml += `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937"><strong>Versand:</strong> ${escapeHtmlForEmail(input.carrierLine)}</p>`;
  }
  if (input.trackUrl) {
    shipHtml += `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937"><a href="${escapeHtmlForEmail(input.trackUrl)}" style="color:${input.primaryColor};font-weight:600">Sendung verfolgen</a></p>`;
  }
  if (input.invoiceNumber) {
    shipHtml += `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${textMuted}">Rechnungsnummer: ${escapeHtmlForEmail(input.invoiceNumber)}${input.invoiceAttached ? " (PDF angehängt)" : ""}</p>`;
  }
  return shipHtml;
}
