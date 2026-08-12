import { getPrisma } from "@/lib/db/prisma";
import { EMAIL_ORDER_CANCELLED } from "@/lib/email/email-types";
import {
  findOrderEmailLog,
  isOrderEmailAlreadySentSuccessfully,
  upsertOrderEmailDeliveryLog,
} from "@/lib/email/order-email-log";
import { sendTransactionalEmail } from "@/lib/email/provider";
import { renderStoredEmailTemplate } from "@/lib/email/templates/load";
import { buildShopTemplateVars, mergeTemplateVars } from "@/lib/email/templates/shop-vars";
import { publicSiteBaseUrl } from "@/lib/email/template-utils";
import { resolveTransactionalEmailBranding } from "@/lib/shop/email-branding";

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

  const branding = await resolveTransactionalEmailBranding();
  const base = publicSiteBaseUrl();
  const successPath = `/checkout/erfolg?nr=${encodeURIComponent(order.orderNumber)}`;
  const successUrl = base ? `${base}${successPath}` : successPath;

  const vars = mergeTemplateVars(buildShopTemplateVars(branding), {
    customer: { first_name: order.shippingFirstName },
    order: {
      number: order.orderNumber,
      status_url: successUrl,
    },
  });

  const rendered = await renderStoredEmailTemplate("order_cancelled", vars);
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
    emailType: EMAIL_ORDER_CANCELLED,
    toEmail: order.email,
    result,
  });
}
