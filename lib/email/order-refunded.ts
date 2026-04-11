import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_REFUNDED } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Hinweis zur Erstattung: nach erfolgreichem Versand höchstens einmal erneut senden (Dedupe).
 */
export async function sendOrderRefundedIfNeeded(orderId: string): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_REFUNDED);
  if (isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      email: true,
      shippingFirstName: true,
      totalGrossCents: true,
      currency: true,
    },
  });
  if (!order) return;

  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const subject = `Erstattung zu Bestellung ${order.orderNumber}`;
  const totalStr = formatPrice(order.totalGrossCents, order.currency);
  const text = [
    `Hallo ${order.shippingFirstName},`,
    "",
    `zu deiner Bestellung ${order.orderNumber}: eine Erstattung über ${totalStr} wurde veranlasst bzw. verbucht (je nach Zahlungsart kann es einige Werktage dauern).`,
    "",
    "Bei Rückfragen erreichst du uns über die Kontaktdaten im Impressum.",
    "",
    `Bestellübersicht: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hallo ${escapeHtmlForEmail(order.shippingFirstName)},</p>
<p>Zu deiner Bestellung <strong>${escapeHtmlForEmail(order.orderNumber)}</strong>: eine Erstattung über <strong>${escapeHtmlForEmail(totalStr)}</strong> wurde veranlasst bzw. verbucht. Je nach Zahlungsart kann die Gutschrift einige Werktage dauern.</p>
<p>Bei Rückfragen nutze bitte die Kontaktdaten im Impressum.</p>
<p style="margin-top:1.25rem"><a href="${escapeHtmlForEmail(successUrl)}">Bestellung ansehen</a></p>
<p>Liebe Grüße<br/>jerry's</p>
</body></html>`;

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
