import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cancelPendingPayPalCheckoutByToken } from "@/lib/checkout/cancel-pending-paypal-by-token";

/**
 * PayPal `cancel_url`: Token auswerten, Pending-Order stornieren, zurück zum Checkout
 * (Warenkorb bleibt erhalten — Clear erst nach erfolgreichem Capture).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const token = url.searchParams.get("token");

  if (token) {
    await cancelPendingPayPalCheckoutByToken(token);
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  revalidatePath("/produkte");
  revalidatePath("/admin/orders");

  return NextResponse.redirect(`${origin}/checkout?paypal=abbruch`);
}
