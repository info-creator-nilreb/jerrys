import Stripe from "stripe";
import { canonicalSiteOrigin } from "@/lib/site/canonical-origin";

export type StripeCheckoutLineItem = {
  title: string;
  quantity: number;
  unitAmountGrossCents: number;
};

export async function createStripeCheckoutSession(
  stripe: Stripe,
  params: {
    orderId: string;
    orderNumber: string;
    email: string;
    currency: string;
    lines: StripeCheckoutLineItem[];
  },
): Promise<Stripe.Response<Stripe.Checkout.Session>> {
  const origin = canonicalSiteOrigin().replace(/\/$/, "");
  if (!origin) {
    throw new Error(
      "Keine öffentliche Basis-URL (NEXT_PUBLIC_SITE_URL / AUTH_URL / VERCEL_URL) für Stripe-Checkout.",
    );
  }
  const curr = params.currency.trim().toLowerCase();
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    line_items: params.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: curr,
        unit_amount: line.unitAmountGrossCents,
        product_data: {
          name: line.title,
        },
      },
    })),
    metadata: {
      orderId: params.orderId,
    },
    success_url: `${origin}/checkout/erfolg?nr=${encodeURIComponent(params.orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
  });
}
