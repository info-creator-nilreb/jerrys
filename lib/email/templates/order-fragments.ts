import { formatPrice } from "@/lib/catalog/format";
import { labelForShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
import { isPickupDeliveryMethod } from "@/lib/checkout/delivery-method";
import {
  buildOrderItemsTableHtml,
  grayInfoCard,
  tintedCard,
  transactionalCtaButton,
  TRANSACTIONAL_EMAIL_DESIGN,
  type OrderLineItemForEmail,
} from "@/lib/email/transactional-email-layout";
import type { TransactionalEmailBranding } from "@/lib/shop/email-branding";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";

const { textMuted } = TRANSACTIONAL_EMAIL_DESIGN;

export type OrderAddressSnapshot = {
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  zip: string;
  city: string;
  country: string;
};

/** Order-Snapshot-Felder für Liefer- und Rechnungsadresse in Transaktions-Mails. */
export type OrderAddressSource = {
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string | null;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingZip: string;
  shippingCity: string;
  shippingCountry: string;
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string | null;
  billingLine1: string;
  billingLine2: string | null;
  billingZip: string;
  billingCity: string;
  billingCountry: string;
  deliveryMethod: string;
  email: string;
};

export function shippingAddressFromOrder(order: OrderAddressSource): OrderAddressSnapshot {
  return {
    firstName: order.shippingFirstName,
    lastName: order.shippingLastName,
    company: order.shippingCompany,
    line1: order.shippingLine1,
    line2: order.shippingLine2,
    zip: order.shippingZip,
    city: order.shippingCity,
    country: order.shippingCountry,
  };
}

export function billingAddressFromOrder(order: OrderAddressSource): OrderAddressSnapshot {
  return {
    firstName: order.billingFirstName,
    lastName: order.billingLastName,
    company: order.billingCompany,
    line1: order.billingLine1,
    line2: order.billingLine2,
    zip: order.billingZip,
    city: order.billingCity,
    country: order.billingCountry,
  };
}

function shippingAddressTitle(deliveryMethod: string): string {
  return isPickupDeliveryMethod(deliveryMethod) ? "Abholung" : "Versandadresse";
}

/** Mehrzeilige Adresse für Plaintext-Mails. */
export function orderAddressText(addr: OrderAddressSnapshot): string {
  const lines: string[] = [`${addr.firstName} ${addr.lastName}`.trim()];
  if (addr.company?.trim()) lines.push(addr.company.trim());
  lines.push(addr.line1.trim());
  if (addr.line2?.trim()) lines.push(addr.line2.trim());
  lines.push(`${addr.zip.trim()} ${addr.city.trim()}`.trim());
  lines.push(labelForShippingCountryCode(addr.country));
  return lines.filter(Boolean).join("\n");
}

function orderAddressHtmlLines(addr: OrderAddressSnapshot): string {
  const lines: string[] = [
    `${escapeHtmlForEmail(addr.firstName)} ${escapeHtmlForEmail(addr.lastName)}`.trim(),
  ];
  if (addr.company?.trim()) lines.push(escapeHtmlForEmail(addr.company.trim()));
  lines.push(escapeHtmlForEmail(addr.line1.trim()));
  if (addr.line2?.trim()) lines.push(escapeHtmlForEmail(addr.line2.trim()));
  lines.push(
    `${escapeHtmlForEmail(addr.zip.trim())} ${escapeHtmlForEmail(addr.city.trim())}`.trim(),
  );
  lines.push(escapeHtmlForEmail(labelForShippingCountryCode(addr.country)));
  return lines.join("<br/>");
}

function orderAddressColumnHtml(input: {
  title: string;
  addr: OrderAddressSnapshot;
  email?: string;
  align: "left" | "right";
}): string {
  const padSide = input.align === "left" ? "padding-right:11px" : "padding-left:11px";
  const emailLine =
    input.email?.trim() ?
      `<br/><a href="mailto:${escapeHtmlForEmail(input.email.trim())}" style="color:${textMuted};text-decoration:none;word-wrap:break-word">${escapeHtmlForEmail(input.email.trim())}</a>`
    : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="min-width:100%"><tr><th style="mso-line-height-rule:exactly;${padSide}" align="${input.align}" bgcolor="#ffffff" valign="top"><h3 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.4;font-weight:400;color:#666666">${escapeHtmlForEmail(input.title)}</h3><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#777777">${orderAddressHtmlLines(input.addr)}${emailLine}</p></th></tr></table>`;
}

/** Einzelblock Versand/Abholadresse. */
export function orderShippingAddressHtml(order: OrderAddressSource): string {
  return orderAddressColumnHtml({
    title: shippingAddressTitle(order.deliveryMethod),
    addr: shippingAddressFromOrder(order),
    align: "left",
  });
}

/** Einzelblock Rechnungsadresse inkl. Bestell-E-Mail. */
export function orderBillingAddressHtml(order: OrderAddressSource): string {
  return orderAddressColumnHtml({
    title: "Rechnungsadresse",
    addr: billingAddressFromOrder(order),
    email: order.email,
    align: "left",
  });
}

/** Zwei-Spalten-Layout (Versand/Abholung links, Rechnung rechts) — tabellenbasiert für E-Mail-Clients. */
export function orderAddressesTwoColumnHtml(order: OrderAddressSource): string {
  const left = orderAddressColumnHtml({
    title: shippingAddressTitle(order.deliveryMethod),
    addr: shippingAddressFromOrder(order),
    align: "left",
  });
  const right = orderAddressColumnHtml({
    title: "Rechnungsadresse",
    addr: billingAddressFromOrder(order),
    email: order.email,
    align: "right",
  });
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif"><tr><th width="50%" style="mso-line-height-rule:exactly;vertical-align:top" align="left" bgcolor="#ffffff" valign="top">${left}</th><th width="50%" style="mso-line-height-rule:exactly;vertical-align:top" align="right" bgcolor="#ffffff" valign="top">${right}</th></tr></table>`;
}

function orderShippingTrackingColumnHtml(input: {
  carrierLine: string | null;
  trackUrl: string | null;
  primaryColor: string;
}): string {
  const headingColor = "#666666";
  const bodyColor = "#777777";
  let body = "";
  if (input.carrierLine?.trim()) {
    body += `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${bodyColor}">${escapeHtmlForEmail(input.carrierLine.trim())}</p>`;
  }
  if (input.trackUrl?.trim()) {
    const url = escapeHtmlForEmail(input.trackUrl.trim());
    body += `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55"><a href="${url}" style="color:${escapeHtmlForEmail(input.primaryColor)};font-weight:600;text-decoration:none">Sendung verfolgen</a></p>`;
  }
  if (!body) {
    body = `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${bodyColor}">—</p>`;
  }
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="min-width:100%"><tr><th style="mso-line-height-rule:exactly;padding-left:11px" align="right" bgcolor="#ffffff" valign="top"><h3 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.4;font-weight:400;color:${headingColor}">Versand &amp; Tracking</h3>${body}</th></tr></table>`;
}

/** Versandadresse links, Versand/Tracking rechts (Versandbestätigung). */
export function orderShippingAddressAndTrackingHtml(
  order: OrderAddressSource,
  input: {
    carrierLine: string | null;
    trackUrl: string | null;
    primaryColor: string;
  },
): string {
  const left = orderAddressColumnHtml({
    title: shippingAddressTitle(order.deliveryMethod),
    addr: shippingAddressFromOrder(order),
    align: "left",
  });
  const right = orderShippingTrackingColumnHtml(input);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif"><tr><th width="50%" style="mso-line-height-rule:exactly;vertical-align:top" align="left" bgcolor="#ffffff" valign="top">${left}</th><th width="50%" style="mso-line-height-rule:exactly;vertical-align:top" align="right" bgcolor="#ffffff" valign="top">${right}</th></tr></table>`;
}

/** Rechnungshinweis für Versandmail (PDF-Anhang statt Download-Link). */
export function orderInvoiceShippedNoteHtml(
  invoiceNumber: string | null,
  invoiceAttached: boolean,
): string {
  const num = invoiceNumber?.trim();
  if (!num) return "";
  const note = invoiceAttached ? " — die Rechnung findest du im PDF-Anhang dieser E-Mail." : ".";
  return `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#777777;text-align:center">Rechnungsnummer ${escapeHtmlForEmail(num)}${note}</p>`;
}

/** Intro, CTA und Hinweis zur Sendungsverfolgung; leer wenn keine Tracking-URL. */
export function orderTrackingSectionHtml(
  trackUrl: string | null,
  branding: TransactionalEmailBranding,
): string {
  const url = trackUrl?.trim();
  if (!url) return "";
  const mutedColor = "#cccccc";
  const bodyColor = "#777777";
  const cta = transactionalCtaButton(url, "Sendungsverfolgung", branding);
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${bodyColor};text-align:center">Du kannst den Status deiner Lieferung verfolgen:</p>${cta}<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${mutedColor};text-align:center">Bitte beachte, dass es eine Weile dauern kann, bis die Sendungsdaten aktualisiert werden.</p>`;
}

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
  const line = "#eeeeee";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333"><tr><td style="padding:8px 0;border-top:1px solid ${line}">Zwischensumme</td><td style="padding:8px 0;border-top:1px solid ${line};text-align:right;font-weight:600;color:#1f2937">${sub}</td></tr><tr><td style="padding:6px 0">${shipLabel}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#1f2937">${ship}</td></tr><tr><td style="padding:10px 0 6px;font-weight:700;font-size:15px;color:#1f2937">Gesamt</td><td style="padding:10px 0 6px;text-align:right;font-weight:700;font-size:16px;color:#1f2937">${tot}</td></tr><tr><td colspan="2" style="padding:4px 0 0;font-size:13px;color:${textMuted}">inkl. MwSt. · Zahlungsart: ${pm}</td></tr></table>`;
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

/** Rückerstattungsbetrag-Zeile im Orderly-Layout (links Label, rechts Betrag). */
export function orderRefundAmountRowHtml(amountLabel: string): string {
  const amount = escapeHtmlForEmail(amountLabel);
  const headingColor = "#666666";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif"><tr><th style="mso-line-height-rule:exactly;width:65%;padding:5px 0;font-size:15px;line-height:1.55;font-weight:400;color:${headingColor}" align="left" bgcolor="#ffffff" valign="top">Rückerstattungsbetrag</th><th style="mso-line-height-rule:exactly;width:35%;padding:5px 0;font-size:15px;line-height:1.55;font-weight:400;color:${headingColor};white-space:nowrap" align="right" bgcolor="#ffffff" valign="middle">${amount}</th></tr></table>`;
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
