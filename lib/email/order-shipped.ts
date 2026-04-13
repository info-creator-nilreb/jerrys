import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_SHIPPED } from "@/lib/email/email-types";
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
  grayInfoCard,
  TRANSACTIONAL_EMAIL_DESIGN,
  wrapTransactionalEmailHtml,
} from "@/lib/email/transactional-email-layout";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Versandbenachrichtigung: nach Statuswechsel auf „versendet“ höchstens einmal (Dedupe).
 */
export async function sendOrderShippedIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_SHIPPED);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order?.items.length) return;

  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const lines = order.items
    .map(
      (i) =>
        `- ${i.productTitleSnapshot} × ${i.quantity}: ${formatPrice(i.lineTotalGrossCents, i.currency)}`,
    )
    .join("\n");

  const subject = `Deine Bestellung ${order.orderNumber} wurde versendet`;
  const text = [
    `Hallo ${order.shippingFirstName},`,
    "",
    "gute Neuigkeiten: deine Bestellung wurde versendet und ist auf dem Weg zu dir.",
    "",
    `Bestellnummer: ${order.orderNumber}`,
    "",
    "Positionen:",
    lines,
    "",
    `Zur Bestellung: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;
  const orderNumCard = grayInfoCard(
    `<strong style="font-size:13px;letter-spacing:0.02em;color:${textMuted}">Bestellnummer</strong><br/><span style="font-size:17px;font-weight:700;color:#1f2937">#${escapeHtmlForEmail(order.orderNumber)}</span>`,
  );

  const itemsHtml = buildOrderItemsTableHtml(orderItemsToEmailLineItems(order.items), formatPrice);

  const hintHtml = `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${divider};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${textMuted}">Sendungsverfolgung: ggf. separat vom Versanddienstleister. Rückfragen über die Kontaktdaten im Impressum.</p>`;

  const bodyHtml = `${orderNumCard}${itemsHtml}${hintHtml}`;

  const html = wrapTransactionalEmailHtml({
    variant: "shipping",
    documentTitle: subject,
    heading: "Deine Bestellung ist unterwegs!",
    intro: "Gute Neuigkeiten: deine Bestellung wurde versendet und ist jetzt auf dem Weg zu dir.",
    bodyHtml,
    cta: { href: successUrl, label: "Zur Bestellung" },
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
    emailType: EMAIL_ORDER_SHIPPED,
    toEmail: order.email,
    result,
  });
}
