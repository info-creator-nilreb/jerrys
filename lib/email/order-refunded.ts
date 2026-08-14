import { formatPrice } from "@/lib/catalog/format";
import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_REFUNDED } from "@/lib/email/email-types";
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
  orderItemsHtml,
  orderItemsText,
  orderNumberCardHtml,
  orderRefundAmountRowHtml,
  refundAmountCardHtml,
  refundMetaHtml,
} from "@/lib/email/templates/order-fragments";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { publicSiteBaseUrl } from "@/lib/email/template-utils";
import {
  formatGermanDateMedium,
  transactionalPaymentLabel,
} from "@/lib/email/transactional-email-layout";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";

/**
 * Hinweis zur Erstattung: nach Statuswechsel auf „erstattet“ höchstens einmal (Dedupe).
 */
export async function sendOrderRefundedIfNeeded(
  orderId: string,
  options?: { force?: boolean },
): Promise<void> {
  const prisma = getPrisma();

  const existing = await findOrderEmailLog(prisma, orderId, EMAIL_ORDER_REFUNDED);
  if (!options?.force && isOrderEmailAlreadySentSuccessfully(existing)) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: orderItemsIncludeForTransactionalEmail },
  });
  if (!order) return;

  const branding = await resolveTransactionalEmailBranding();
  const base = publicSiteBaseUrl();
  const shopUrl = base ? `${base}/` : "/";

  const refundDate = formatGermanDateMedium(new Date());
  const totalStr = formatPrice(order.totalGrossCents, order.currency);
  const payLabel = transactionalPaymentLabel(order.paymentMethod);

  const itemsHtml =
    order.items.length > 0
      ? orderItemsHtml(orderItemsToEmailLineItems(order.items))
      : `<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333">Positionen siehe Bestellübersicht.</p>`;

  const vars = mergeTemplateVars(
    buildShopTemplateVars(branding, {
      cta: { href: shopUrl, label: "Zurück zum Shop" },
      heroVariant: "refund",
    }),
    {
      customer: { first_name: order.shippingFirstName },
      order: {
        number: order.orderNumber,
        total: totalStr,
        refund_date: refundDate,
        payment_method: payLabel,
        number_card_html: orderNumberCardHtml(order.orderNumber),
        refund_card_html: refundAmountCardHtml(totalStr),
        refund_amount_row_html: orderRefundAmountRowHtml(totalStr),
        items_html: itemsHtml,
        items_text: orderItemsText(
          order.items.map((i) => ({
            productTitleSnapshot: i.productTitleSnapshot,
            quantity: i.quantity,
            lineTotalGrossCents: i.lineTotalGrossCents,
            currency: i.currency,
          })),
        ),
        refund_meta_html: refundMetaHtml(refundDate, payLabel),
      },
    },
  );

  const rendered = await renderStoredEmailTemplate("order_refunded", vars);
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
    emailType: EMAIL_ORDER_REFUNDED,
    toEmail: order.email,
    result,
  });
}
