import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendOrderConfirmationIfNeeded } from "@/lib/email/order-confirmation";
import { getPrisma } from "@/lib/db/prisma";
import { finalizeOrderAfterStripePayment } from "@/lib/orders/finalize-stripe-checkout-payment";
import { createLogger, errorMeta } from "@/lib/logging/logger";

const log = createLogger("stripe.webhook");

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!webhookSecret || !secretKey) {
    return NextResponse.json({ error: "Stripe-Webhook nicht konfiguriert." }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Header stripe-signature fehlt." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey, { typescript: true });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    log.warn("stripe_signature_invalid", { ...errorMeta(e) });
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    const orderIdRaw = session.metadata?.orderId;
    const orderId = typeof orderIdRaw === "string" && orderIdRaw.length > 0 ? orderIdRaw : null;
    if (!orderId) {
      log.error("stripe_checkout_missing_order_id", { sessionId: session.id });
      return NextResponse.json({ error: "orderId in metadata fehlt." }, { status: 400 });
    }

    const result = await finalizeOrderAfterStripePayment(getPrisma(), {
      orderId,
      stripeSessionId: session.id,
    });

    if (!result.ok) {
      if (result.error === "invalid_status" || result.error === "not_found") {
        return NextResponse.json({ received: true });
      }
      log.error("stripe_finalize_failed", { orderId, error: result.error, sessionId: session.id });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await sendOrderConfirmationIfNeeded(orderId);
    revalidatePath("/admin/orders");
    revalidatePath("/produkte");
    revalidatePath("/", "layout");
  }

  return NextResponse.json({ received: true });
}
