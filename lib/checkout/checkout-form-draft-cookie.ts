import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHECKOUT_FORM_DRAFT_COOKIE_NAME,
  checkoutFormDraftCookieOptions,
  checkoutFormDraftFromOrderSnapshot,
  encodeCheckoutFormDraftCookie,
  type CheckoutFormDraft,
} from "@/lib/checkout/checkout-form-draft";
import { getPrisma } from "@/lib/db/prisma";

export function appendCheckoutFormDraftCookie(res: NextResponse, draft: CheckoutFormDraft): void {
  res.cookies.set(
    CHECKOUT_FORM_DRAFT_COOKIE_NAME,
    encodeCheckoutFormDraftCookie({ ...draft, savedAt: Date.now() }),
    checkoutFormDraftCookieOptions(),
  );
}

export async function setCheckoutFormDraftCookieFromServer(draft: CheckoutFormDraft): Promise<void> {
  const jar = await cookies();
  jar.set(
    CHECKOUT_FORM_DRAFT_COOKIE_NAME,
    encodeCheckoutFormDraftCookie({ ...draft, savedAt: Date.now() }),
    checkoutFormDraftCookieOptions(),
  );
}

export async function loadCheckoutFormDraftForPayPalOrder(
  paypalOrderIdRaw: string,
): Promise<CheckoutFormDraft | null> {
  const paypalOrderId = paypalOrderIdRaw.trim();
  if (!paypalOrderId) return null;
  const payment = await getPrisma().orderPayment.findFirst({
    where: { provider: "paypal", providerRef: paypalOrderId },
    select: {
      order: {
        select: {
          email: true,
          phone: true,
          deliveryMethod: true,
          shippingFirstName: true,
          shippingLastName: true,
          shippingCompany: true,
          shippingLine1: true,
          shippingLine2: true,
          shippingZip: true,
          shippingCity: true,
          shippingCountry: true,
          billingFirstName: true,
          billingLastName: true,
          billingCompany: true,
          billingLine1: true,
          billingLine2: true,
          billingZip: true,
          billingCity: true,
          billingCountry: true,
          promotionCodeSnapshot: true,
        },
      },
    },
  });
  if (!payment?.order) return null;
  return checkoutFormDraftFromOrderSnapshot(payment.order);
}
