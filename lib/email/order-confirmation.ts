import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CONFIRMATION } from "@/lib/email/email-types";
import { sendTransactionalEmail } from "@/lib/email/provider";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function publicSiteBase(): string {
  const a = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (a) return a;
  const b = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (b) return b;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
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
  const base = publicSiteBase();
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
<p>Hallo ${escapeHtml(order.shippingFirstName)},</p>
<p>vielen Dank für deine Bestellung bei jerry's.</p>
<p><strong>Bestellnummer:</strong> ${escapeHtml(order.orderNumber)}<br/>
<strong>Gesamtbetrag:</strong> ${escapeHtml(formatPrice(order.totalGrossCents, order.currency))} inkl. MwSt.<br/>
<strong>Zahlungsart:</strong> ${escapeHtml(paymentLabel(order.paymentMethod))}</p>
<h3 style="font-size:14px;margin:1.25rem 0 0.5rem">Positionen</h3>
<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(lines)}</pre>
<p style="margin-top:1.25rem"><a href="${escapeHtml(successUrl)}">Zur Bestellbestätigung</a></p>
<p>Liebe Grüße<br/>jerry's</p>
</body></html>`;

  return { subject, text, html };
}

/**
 * Sendet die Bestellbestätigung höchstens einmal pro Bestellung (Dedupe über `email_logs`).
 */
export async function sendOrderConfirmationIfNeeded(orderId: string): Promise<void> {
  const prisma = getPrisma();

  const existing = await prisma.emailLog.findUnique({
    where: {
      orderId_emailType: { orderId, emailType: EMAIL_ORDER_CONFIRMATION },
    },
  });
  if (existing?.status === "sent") return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order || !order.items.length) return;

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

  await prisma.emailLog.upsert({
    where: {
      orderId_emailType: { orderId, emailType: EMAIL_ORDER_CONFIRMATION },
    },
    create: {
      orderId,
      emailType: EMAIL_ORDER_CONFIRMATION,
      toEmail: order.email,
      status: result.status,
      providerId: result.providerId ?? null,
      errorMessage: result.errorMessage ?? null,
    },
    update: {
      status: result.status,
      toEmail: order.email,
      providerId: result.providerId ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  });
}
