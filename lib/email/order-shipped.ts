import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_SHIPPED } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Versandbenachrichtigung: nach erfolgreichem Versand höchstens einmal erneut senden (Dedupe).
 */
export async function sendOrderShippedIfNeeded(orderId: string): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_SHIPPED);
  if (isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
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
    "gute Nachrichten: deine Bestellung ist auf dem Weg zu dir.",
    "",
    `Bestellnummer: ${order.orderNumber}`,
    "",
    "Positionen:",
    lines,
    "",
    `Zur Übersicht: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hallo ${escapeHtmlForEmail(order.shippingFirstName)},</p>
<p>Deine Bestellung <strong>${escapeHtmlForEmail(order.orderNumber)}</strong> wurde versendet.</p>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtmlForEmail(lines)}</pre>
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
    emailType: EMAIL_ORDER_SHIPPED,
    toEmail: order.email,
    result,
  });
}
