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
  orderNumberCardHtml,
  orderShippingAddressAndTrackingHtml,
  orderTrackingCtaHtml,
  orderTrackingSectionHtml,
  shippingAddressFromOrder,
  shippingDetailsHtml,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { publicSiteBaseUrl } from "@/lib/email/template-utils";
import { buildInvoicePdfBuffer } from "@/lib/invoice/build-invoice-pdf";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";
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

  const branding = await resolveTransactionalEmailBranding();
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

  const lineItems = orderItemsToEmailLineItems(order.items);

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, {
      cta: { href: successUrl, label: "Zur Bestellung" },
      heroVariant: "shipping",
    }),
    {
      customer: { first_name: order.shippingFirstName },
      order: {
        number: order.orderNumber,
        carrier_line: carrierLine ?? "",
        tracking_url: trackUrl ?? "",
        invoice_number: order.invoiceNumber ?? "",
        invoice_note: pdfAttachment ? " (PDF angehängt)" : "",
        number_card_html: orderNumberCardHtml(order.orderNumber),
        items_html: orderItemsHtml(lineItems),
        invoice_note_html: orderInvoiceShippedNoteHtml(
          order.invoiceNumber,
          Boolean(pdfAttachment),
        ),
        shipping_address_tracking_html: orderShippingAddressAndTrackingHtml(order, {
          carrierLine,
          trackUrl,
          primaryColor: branding.primary,
        }),
        shipping_address_text: orderAddressText(shippingAddressFromOrder(order)),
        tracking_cta_html: orderTrackingCtaHtml(trackUrl, branding),
        tracking_section_html: orderTrackingSectionHtml(trackUrl, branding),
        shipping_details_html: shippingDetailsHtml({
          carrierLine,
          trackUrl,
          invoiceNumber: order.invoiceNumber,
          invoiceAttached: Boolean(pdfAttachment),
          primaryColor: branding.primary,
        }),
        items_text: orderItemsText(
          order.items.map((i) => ({
            productTitleSnapshot: i.productTitleSnapshot,
            quantity: i.quantity,
            lineTotalGrossCents: i.lineTotalGrossCents,
            currency: i.currency,
          })),
        ),
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
