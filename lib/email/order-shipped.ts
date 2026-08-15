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
  orderAddressText,
  orderInvoiceShippedNoteHtml,
  orderItemsHtml,
  orderItemsText,
  orderShippingAddressAndTrackingHtml,
  shippingAddressFromOrder,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { emailAbsoluteHref } from "@/lib/email/email-absolute-url";
import { buildInvoicePdfBuffer } from "@/lib/invoice/build-invoice-pdf";
import {
  transactionalEmailBrandingFromSettings,
} from "@/lib/shop/email-branding";
import { getShopSettings } from "@/lib/shop/shop-settings";
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
      // PDF optional — Mail ohne Anhang
    }
  }

  const settings = await getShopSettings();
  const branding = transactionalEmailBrandingFromSettings(settings);
  const successUrl = emailAbsoluteHref(
    `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`,
  );

  const trackUrl =
    order.shippingCarrier && order.trackingNumber
      ? buildCarrierTrackingUrl(order.shippingCarrier, order.trackingNumber)
      : null;
  const carrierLine =
    order.shippingCarrier && order.trackingNumber
      ? `${shippingCarrierLabel(order.shippingCarrier)} · ${order.trackingNumber.trim()}`
      : null;

  const lineItems = orderItemsToEmailLineItems(order.items);
  const itemsForText = order.items.map((i) => ({
    productTitleSnapshot: i.productTitleSnapshot,
    quantity: i.quantity,
    lineTotalGrossCents: i.lineTotalGrossCents,
    currency: i.currency,
  }));

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, {
      cta: { href: successUrl, label: "Zur Bestellung" },
      heroVariant: "shipping",
      settings,
    }),
    {
      customer: { first_name: order.shippingFirstName },
      order: {
        number: order.orderNumber,
        carrier_line: carrierLine ?? "",
        tracking_url: trackUrl ?? "",
        invoice_number: order.invoiceNumber ?? "",
        invoice_note: pdfAttachment ? " (PDF angehängt)" : "",
        invoice_note_html: orderInvoiceShippedNoteHtml(
          order.invoiceNumber,
          Boolean(pdfAttachment),
        ),
        items_html: orderItemsHtml(lineItems),
        shipping_address_tracking_html: orderShippingAddressAndTrackingHtml(order, {
          carrierLine,
          trackUrl,
          primaryColor: branding.primary,
        }),
        shipping_address_text: orderAddressText(shippingAddressFromOrder(order)),
        items_text: orderItemsText(itemsForText),
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("order_shipped", vars);
  if (!rendered.enabled && !options?.force) return;

  let result: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    result = await sendTransactionalEmail({
      to: order.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
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
