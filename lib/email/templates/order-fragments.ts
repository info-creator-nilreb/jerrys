import { formatPrice } from "@/lib/catalog/format";
import { labelForShippingCountryCode } from "@/lib/catalog/shipping-countries-catalog";
import { isPickupDeliveryMethod } from "@/lib/checkout/delivery-method";
import {
  buildOrderItemsTableHtml,
  grayInfoCard,
  tintedCard,
  TRANSACTIONAL_EMAIL_DESIGN,
  type OrderLineItemForEmail,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail } from "@/lib/email/template-utils";

const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;

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
