import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_REFUNDED } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import {
  orderItemsIncludeForTransactionalEmail,
  orderItemsToEmailLineItems,
} from "@/lib/email/order-email-line-items";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  buildOrderItemsTableHtml,
  formatGermanDateMedium,
  grayInfoCard,
  tintedCard,
  transactionalPaymentLabel,
  TRANSACTIONAL_EMAIL_DESIGN,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Hinweis zur Erstattung: nach Statuswechsel auf „erstattet“ höchstens einmal (Dedupe).
 */
export async function sendOrderRefundedIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_REFUNDED);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order) return;

  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;
  const shopUrl = base ? `${base}/` : "/";

  const refundDate = formatGermanDateMedium(new Date());
  const totalStr = formatPrice(order.totalGrossCents, order.currency);
  const payLabel = transactionalPaymentLabel(order.paymentMethod);

  const subject = `Erstattung zu Bestellung ${order.orderNumber}`;
  const text = [
    `Hallo ${order.shippingFirstName},`,
    "",
    "wir haben deine Rückerstattung bearbeitet. Der Betrag wird in Kürze auf deinem Konto gutgeschrieben (je nach Zahlungsart einige Werktage).",
    "",
    `Bestellnummer: ${order.orderNumber}`,
    `Erstattungsbetrag: ${totalStr}`,
    `Erstattet am: ${refundDate}`,
    `Zahlungsmethode: ${payLabel}`,
    "",
    "Bei Rückfragen erreichst du uns über die Kontaktdaten im Impressum.",
    "",
    `Shop: ${shopUrl}`,
    `Bestellübersicht: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const { textMuted } = TRANSACTIONAL_EMAIL_DESIGN;
  const orderNumCard = grayInfoCard(
    `<strong style="font-size:13px;letter-spacing:0.02em;color:${textMuted}">Bestellnummer</strong><br/><span style="font-size:17px;font-weight:700;color:#1f2937">#${escapeHtmlForEmail(order.orderNumber)}</span>`,
  );

  const refundAmt = escapeHtmlForEmail(totalStr);
  const refundCard = tintedCard(
    "#ffffff",
    `<strong style="font-size:13px;color:${textMuted}">Erstattungsbetrag</strong><br/><span style="font-size:20px;font-weight:700;color:#1f2937">${refundAmt}</span>`,
  );

  const itemsHtml =
    order.items.length > 0
      ? buildOrderItemsTableHtml(orderItemsToEmailLineItems(order.items), formatPrice)
      : `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333">Positionen siehe Bestellübersicht.</p>`;

  const metaHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6"><tr><td><strong style="color:#1f2937">Erstattet am</strong> ${escapeHtmlForEmail(refundDate)}</td></tr><tr><td style="padding-top:6px"><strong style="color:#1f2937">Zahlungsmethode</strong> ${escapeHtmlForEmail(payLabel)}</td></tr></table>`;

  const bodyHtml = `${orderNumCard}${refundCard}${itemsHtml}${metaHtml}`;

  const html = wrapTransactionalEmailHtml({
    variant: "refund",
    documentTitle: subject,
    heading: "Deine Erstattung wurde veranlasst",
    intro:
      "Wir haben deine Rückerstattung bearbeitet. Der Betrag wird in Kürze auf deinem Konto gutgeschrieben (je nach Zahlungsart kann es einige Werktage dauern).",
    bodyHtml,
    cta: { href: shopUrl, label: "Zurück zum Shop" },
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
    emailType: EMAIL_ORDER_REFUNDED,
    toEmail: order.email,
    result,
  });
}
