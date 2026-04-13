import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CONFIRMATION } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  orderItemsIncludeForTransactionalEmail,
  orderItemsToEmailLineItems,
} from "@/lib/email/order-email-line-items";
import {
  buildOrderItemsTableHtml,
  grayInfoCard,
  transactionalPaymentLabel,
  TRANSACTIONAL_EMAIL_DESIGN,
  type OrderLineItemForEmail,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

type OrderForEmail = {
  orderNumber: string;
  shippingFirstName: string;
  email: string;
  paymentMethod: string;
  totalGrossCents: number;
  subtotalGrossCents: number;
  shippingCents: number;
  currency: string;
  items: Array<OrderLineItemForEmail & { taxRatePercentSnapshot: number }>;
};

function buildBodies(order: OrderForEmail): { subject: string; text: string; html: string } {
  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const lines = order.items
    .map(
      (i) =>
        `- ${i.productTitleSnapshot} × ${i.quantity}: ${formatPrice(i.lineTotalGrossCents, i.currency)} (inkl. ${i.taxRatePercentSnapshot}% MwSt.)`,
    )
    .join("\n");

  const subject = `Bestellbestätigung ${order.orderNumber}`;

  const text = [
    `Hallo ${order.shippingFirstName},`,
    "",
    "vielen Dank für deine Bestellung bei jerry's.",
    "",
    `Bestellnummer: ${order.orderNumber}`,
    `Zwischensumme: ${formatPrice(order.subtotalGrossCents, order.currency)}`,
    `Versand: ${formatPrice(order.shippingCents, order.currency)}`,
    `Gesamt: ${formatPrice(order.totalGrossCents, order.currency)} inkl. MwSt.`,
    `Zahlungsart: ${transactionalPaymentLabel(order.paymentMethod)}`,
    "",
    "Positionen:",
    lines,
    "",
    `Bestellung ansehen: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const sub = escapeHtmlForEmail(formatPrice(order.subtotalGrossCents, order.currency));
  const ship = escapeHtmlForEmail(formatPrice(order.shippingCents, order.currency));
  const tot = escapeHtmlForEmail(formatPrice(order.totalGrossCents, order.currency));
  const pm = escapeHtmlForEmail(transactionalPaymentLabel(order.paymentMethod));

  const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;
  const orderNumCard = grayInfoCard(
    `<strong style="font-size:13px;letter-spacing:0.02em;color:${textMuted}">Bestellnummer</strong><br/><span style="font-size:17px;font-weight:700;color:#1f2937">#${escapeHtmlForEmail(order.orderNumber)}</span>`,
  );

  const itemsHtml = buildOrderItemsTableHtml(order.items, formatPrice);

  const totalsHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333"><tr><td style="padding:6px 0;border-top:2px solid ${divider}">Zwischensumme</td><td style="padding:6px 0;border-top:2px solid ${divider};text-align:right;font-weight:600;color:#1f2937">${sub}</td></tr><tr><td style="padding:6px 0;border-bottom:1px solid ${divider}">Versand</td><td style="padding:6px 0;border-bottom:1px solid ${divider};text-align:right;font-weight:600;color:#1f2937">${ship}</td></tr><tr><td style="padding:10px 0 6px;font-weight:700;font-size:15px;color:#1f2937">Gesamt</td><td style="padding:10px 0 6px;text-align:right;font-weight:700;font-size:16px;color:#1f2937">${tot}</td></tr><tr><td colspan="2" style="padding:4px 0 0;font-size:13px;color:${textMuted}">inkl. MwSt. · Zahlungsart: ${pm}</td></tr></table>`;

  const bodyHtml = `${orderNumCard}${itemsHtml}${totalsHtml}`;

  const html = wrapTransactionalEmailHtml({
    variant: "order",
    documentTitle: subject,
    heading: "Vielen Dank für deine Bestellung!",
    intro: "Wir haben deine Bestellung erhalten und bereiten sie mit Sorgfalt vor.",
    bodyHtml,
    cta: { href: successUrl, label: "Bestellung ansehen" },
  });

  return { subject, text, html };
}

/**
 * Sendet die Bestellbestätigung höchstens einmal erfolgreich pro Bestellung (Dedupe über `email_logs`).
 */
export async function sendOrderConfirmationIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_CONFIRMATION);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order || !order.items.length) return;
  if (order.status === "pending_payment") return;

  const tableLines = orderItemsToEmailLineItems(order.items);
  const itemsForBodies = order.items.map((line, idx) => ({
    ...tableLines[idx]!,
    taxRatePercentSnapshot: line.taxRatePercentSnapshot,
  }));

  const { subject, text, html } = buildBodies({
    orderNumber: order.orderNumber,
    shippingFirstName: order.shippingFirstName,
    email: order.email,
    paymentMethod: order.paymentMethod,
    totalGrossCents: order.totalGrossCents,
    subtotalGrossCents: order.subtotalGrossCents,
    shippingCents: order.shippingCents,
    currency: order.currency,
    items: itemsForBodies,
  });

  let result: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    result = await sendTransactionalEmail({ to: order.email, subject, text, html });
  } catch (e) {
    result = {
      status: "failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  await upsertOrderEmailDeliveryLog(prisma, {
    orderId,
    emailType: EMAIL_ORDER_CONFIRMATION,
    toEmail: order.email,
    result,
  });
}
