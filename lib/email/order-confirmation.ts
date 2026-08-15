import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CONFIRMATION } from "@/lib/email/email-types";
import { emailAbsoluteHref } from "@/lib/email/email-absolute-url";
import {
  claimOrderEmailSend,
  findOrderEmailLog,
  releaseOrderEmailClaim,
  shouldSkipOrderEmailSend,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import {
  orderItemsIncludeForTransactionalEmail,
  orderItemsToEmailLineItems,
} from "@/lib/email/order-email-line-items";
import {
  orderAddressesTwoColumnHtml,
  orderBillingAddressHtml,
  orderItemsHtml,
  orderItemsText,
  orderNumberCardHtml,
  orderShippingAddressHtml,
  orderAddressText,
  billingAddressFromOrder,
  shippingAddressFromOrder,
  orderTotalsHtml,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
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

  if (!options?.force) {
    const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_CONFIRMATION);
    if (shouldSkipOrderEmailSend(existing)) return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order || !order.items.length) return;
  if (order.status === "pending_payment") return;

  if (!options?.force) {
    const claim = await claimOrderEmailSend(prisma, {
      orderId,
      emailType: EMAIL_ORDER_CONFIRMATION,
      toEmail: order.email,
    });
    if (claim === "already_claimed") return;
  }

  const tableLines = orderItemsToEmailLineItems(order.items);
  const itemsForText = order.items.map((line, idx) => ({
    ...tableLines[idx]!,
    taxRatePercentSnapshot: line.taxRatePercentSnapshot,
  }));

  const branding = await resolveTransactionalEmailBranding();
  const successUrl = emailAbsoluteHref(
    `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`,
  );

  const subtotal = formatPrice(order.subtotalGrossCents, order.currency);
  const shipping = formatPrice(order.shippingCents, order.currency);
  const total = formatPrice(order.totalGrossCents, order.currency);
  const paymentMethod = transactionalPaymentLabel(order.paymentMethod);
  const shippingAddr = shippingAddressFromOrder(order);
  const billingAddr = billingAddressFromOrder(order);

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
        shipping_address_html: orderShippingAddressHtml(order),
        billing_address_html: orderBillingAddressHtml(order),
        addresses_html: orderAddressesTwoColumnHtml(order),
        shipping_address_text: orderAddressText(shippingAddr),
        billing_address_text: orderAddressText(billingAddr),
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("order_confirmation", vars);
  if (!rendered.enabled && !options?.force) {
    await releaseOrderEmailClaim(prisma, {
      orderId,
      emailType: EMAIL_ORDER_CONFIRMATION,
    });
    return;
  }

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
