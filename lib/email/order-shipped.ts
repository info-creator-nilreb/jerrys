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
import { buildInvoicePdfBuffer } from "@/lib/invoice/build-invoice-pdf";
import { buildCarrierTrackingUrl, shippingCarrierLabel } from "@/lib/shipping/carrier-tracking";

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

  const orderForPdf = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { orderBy: { id: "asc" } } },
  });

  let pdfAttachment: { filename: string; content: Buffer; contentType: string } | undefined;
  if (orderForPdf?.invoiceNumber) {
    try {
      const buf = await buildInvoicePdfBuffer(orderForPdf);
      pdfAttachment = {
        filename: `Rechnung_${orderForPdf.invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`,
        content: buf,
        contentType: "application/pdf",
      };
    } catch {
      // PDF optional — Mail ohne Anhang, Fehler nur implizit über fehlenden Anhang
    }
  }

  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const trackUrl =
    order.shippingCarrier && order.trackingNumber
      ? buildCarrierTrackingUrl(order.shippingCarrier, order.trackingNumber)
      : null;
  const carrierLine =
    order.shippingCarrier && order.trackingNumber
      ? `${shippingCarrierLabel(order.shippingCarrier)} · ${order.trackingNumber.trim()}`
      : null;

  const lines = order.items
    .map(
      (i) =>
        `- ${i.productTitleSnapshot} × ${i.quantity}: ${formatPrice(i.lineTotalGrossCents, i.currency)}`,
    )
    .join("\n");

  const subject = `Deine Bestellung ${order.orderNumber} wurde versendet`;
  const textParts = [
    `Hallo ${order.shippingFirstName},`,
    "",
    "gute Neuigkeiten: deine Bestellung wurde versendet und ist auf dem Weg zu dir.",
    "",
    `Bestellnummer: ${order.orderNumber}`,
  ];
  if (carrierLine) {
    textParts.push("", "Versand:", carrierLine);
  }
  if (trackUrl) {
    textParts.push("", `Sendung verfolgen: ${trackUrl}`);
  }
  if (order.invoiceNumber) {
    textParts.push("", `Rechnungsnummer: ${order.invoiceNumber}`);
  }
  textParts.push(
    "",
    "Positionen:",
    lines,
    "",
    `Zur Bestellung: ${successUrl}`,
    "",
    "Liebe Grüße",
    "jerry's",
  );
  const text = textParts.join("\n");

  const { textMuted, divider } = TRANSACTIONAL_EMAIL_DESIGN;
  const orderNumCard = grayInfoCard(
    `<strong style="font-size:13px;letter-spacing:0.02em;color:${textMuted}">Bestellnummer</strong><br/><span style="font-size:17px;font-weight:700;color:#1f2937">#${escapeHtmlForEmail(order.orderNumber)}</span>`,
  );

  const itemsHtml = buildOrderItemsTableHtml(orderItemsToEmailLineItems(order.items), formatPrice);

  let shipHtml = "";
  if (carrierLine) {
    shipHtml += `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937"><strong>Versand:</strong> ${escapeHtmlForEmail(carrierLine)}</p>`;
  }
  if (trackUrl) {
    shipHtml += `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937"><a href="${escapeHtmlForEmail(trackUrl)}" style="color:#8bbe25;font-weight:600">Sendung verfolgen</a></p>`;
  }
  if (order.invoiceNumber) {
    shipHtml += `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${textMuted}">Rechnungsnummer: ${escapeHtmlForEmail(order.invoiceNumber)}${pdfAttachment ? " (PDF angehängt)" : ""}</p>`;
  }

  const hintHtml = `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${divider};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${textMuted}">Rückfragen über die Kontaktdaten im Impressum.</p>`;

  const bodyHtml = `${orderNumCard}${itemsHtml}${shipHtml}${hintHtml}`;

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
    result = await sendTransactionalEmail({
      to: order.email,
      subject,
      text,
      html,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    });
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
