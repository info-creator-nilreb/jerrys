import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_PICKED_UP } from "@/lib/email/email-types";
import { emailAbsoluteHref } from "@/lib/email/email-absolute-url";
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
  orderShippingAddressHtml,
  shippingAddressFromOrder,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { buildInvoicePdfBuffer } from "@/lib/invoice/build-invoice-pdf";
import { transactionalEmailBrandingFromSettings } from "@/lib/shop/email-branding";
import { getShopSettings } from "@/lib/shop/shop-settings";

/**
 * Abholbestätigung: nach Statuswechsel auf „abgeholt“ höchstens einmal (Dedupe), inkl. Rechnungs-PDF.
 */
export async function sendOrderPickedUpIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_PICKED_UP);
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
      heroVariant: "order",
      settings,
    }),
    {
      customer: { first_name: order.shippingFirstName },
      order: {
        number: order.orderNumber,
        invoice_number: order.invoiceNumber ?? "",
        invoice_note: pdfAttachment ? " (PDF angehängt)" : "",
        invoice_note_html: orderInvoiceShippedNoteHtml(
          order.invoiceNumber,
          Boolean(pdfAttachment),
        ),
        items_html: orderItemsHtml(lineItems),
        shipping_address_html: orderShippingAddressHtml(order),
        shipping_address_text: orderAddressText(shippingAddressFromOrder(order)),
        items_text: orderItemsText(itemsForText),
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("order_picked_up", vars);
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
    emailType: EMAIL_ORDER_PICKED_UP,
    toEmail: order.email,
    result,
  });
}
