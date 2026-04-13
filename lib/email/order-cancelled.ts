import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CANCELLED } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

/**
 * Storno-Mail: nach erfolgreichem Versand höchstens einmal erneut senden (Dedupe).
 */
export async function sendOrderCancelledIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_CANCELLED);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      email: true,
      shippingFirstName: true,
    },
  });
  if (!order) return;

  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const subject = `Storno zu Bestellung ${order.orderNumber}`;
  const text = [
    `Hallo ${order.shippingFirstName},`,
    "",
    `deine Bestellung ${order.orderNumber} wurde storniert.`,
    "",
    "Bei Fragen erreichst du uns über die Kontaktdaten im Impressum.",
    "",
    `Link zur Bestellübersicht: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hallo ${escapeHtmlForEmail(order.shippingFirstName)},</p>
<p>deine Bestellung <strong>${escapeHtmlForEmail(order.orderNumber)}</strong> wurde storniert.</p>
<p>Bei Fragen nutze bitte die Kontaktdaten im Impressum.</p>
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
    emailType: EMAIL_ORDER_CANCELLED,
    toEmail: order.email,
    result,
  });
}
