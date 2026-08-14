import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CONFIRMATION } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  orderItemsIncludeForTransactionalEmail,
  orderItemsToEmailLineItems,
} from "@/lib/email/order-email-line-items";
import {
  orderItemsHtml,
  orderItemsText,
  orderNumberCardHtml,
  orderTotalsHtml,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { publicSiteBaseUrl } from "@/lib/email/template-utils";
import { transactionalPaymentLabel } from "@/lib/email/transactional-email-layout";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";

/**
 * Sendet die Bestellbestätigung höchstens einmal erfolgreich pro Bestellung (Dedupe über `email_logs`).
 */
export async function sendOrderConfirmationIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_CONFIRMATION);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order || !order.items.length) return;
  if (order.status === "pending_payment") return;

  const tableLines = orderItemsToEmailLineItems(order.items);
  const itemsForText = order.items.map((line, idx) => ({
    ...tableLines[idx]!,
    taxRatePercentSnapshot: line.taxRatePercentSnapshot,
  }));

  const branding = await resolveTransactionalEmailBranding();
  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const subtotal = formatPrice(order.subtotalGrossCents, order.currency);
  const shipping = formatPrice(order.shippingCents, order.currency);
  const total = formatPrice(order.totalGrossCents, order.currency);
  const paymentMethod = transactionalPaymentLabel(order.paymentMethod);

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, {
      cta: { href: successUrl, label: "Bestellung ansehen" },
      heroVariant: "order",
    }),
    {
      customer: { first_name: order.shippingFirstName },
      order: {
        number: order.orderNumber,
        subtotal,
        shipping,
        total,
        payment_method: paymentMethod,
        number_card_html: orderNumberCardHtml(order.orderNumber),
        items_html: orderItemsHtml(tableLines),
        totals_html: orderTotalsHtml({
          subtotal,
          shipping,
          total,
          paymentMethod,
          shippingLabel: order.deliveryMethod === "pickup" ? "Abholung" : "Versand",
        }),
        items_text: orderItemsText(itemsForText),
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("order_confirmation", vars);
  if (!rendered.enabled && !options?.force) return;

  let result: Awaited<ReturnType<typeof sendTransactionalEmail>>;
  try {
    result = await sendTransactionalEmail({
      to: order.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
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
