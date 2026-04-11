import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CONFIRMATION } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { escapeHtmlForEmail, publicSiteBaseUrl } from "@/lib/email/template-utils";

function paymentLabel(method: string): string {
  switch (method) {
    case "vorkasse":
      return "Vorkasse";
    case "paypal":
      return "PayPal";
    case "klarna":
      return "Klarna";
    default:
      return method;
  }
}

type OrderForEmail = {
  orderNumber: string;
  shippingFirstName: string;
  email: string;
  paymentMethod: string;
  totalGrossCents: number;
  currency: string;
  items: {
    productTitleSnapshot: string;
    quantity: number;
    lineTotalGrossCents: number;
    currency: string;
    taxRatePercentSnapshot: number;
  }[];
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
    `vielen Dank für deine Bestellung bei jerry's.`,
    "",
    `Bestellnummer: ${order.orderNumber}`,
    `Gesamtbetrag: ${formatPrice(order.totalGrossCents, order.currency)} inkl. MwSt.`,
    `Zahlungsart: ${paymentLabel(order.paymentMethod)}`,
    "",
    "Positionen:",
    lines,
    "",
    `Bestellstatus ansehen: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hallo ${escapeHtmlForEmail(order.shippingFirstName)},</p>
<p>vielen Dank für deine Bestellung bei jerry's.</p>
<p><strong>Bestellnummer:</strong> ${escapeHtmlForEmail(order.orderNumber)}<br/>
<strong>Gesamtbetrag:</strong> ${escapeHtmlForEmail(formatPrice(order.totalGrossCents, order.currency))} inkl. MwSt.<br/>
<strong>Zahlungsart:</strong> ${escapeHtmlForEmail(paymentLabel(order.paymentMethod))}</p>
<h3 style="font-size:14px;margin:1.25rem 0 0.5rem">Positionen</h3>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtmlForEmail(lines)}</pre>
<p style="margin-top:1.25rem"><a href="${escapeHtmlForEmail(successUrl)}">Zur Bestellbestätigung</a></p>
<p>Liebe Grüße<br/>jerry's</p>
</body></html>`;

  return { subject, text, html };
}

/**
 * Sendet die Bestellbestätigung höchstens einmal erfolgreich pro Bestellung (Dedupe über `email_logs`).
 */
export async function sendOrderConfirmationIfNeeded(orderId: string): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_CONFIRMATION);
  if (isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order || !order.items.length) return;
  if (order.status === "pending_payment") return;

  const { subject, text, html } = buildBodies(order);

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
