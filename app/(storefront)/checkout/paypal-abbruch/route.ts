import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { cancelPendingPayPalCheckoutByToken } from "@/lib/checkout/cancel-pending-paypal-by-token";
import {
  appendCheckoutFormDraftCookie,
  loadCheckoutFormDraftForPayPalOrder,
} from "@/lib/checkout/checkout-form-draft-cookie";

/**
 * PayPal `cancel_url`: Token auswerten, Pending-Order stornieren, zurück zum Checkout
 * (Warenkorb bleibt erhalten — Clear erst nach erfolgreichem Capture).
 * Die Formularfelder kommen als Cookie mit, damit Safari/ITP sessionStorage nicht leert.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const token = url.searchParams.get("token");
  const draft = token ? await loadCheckoutFormDraftForPayPalOrder(token) : null;

  if (token) {
    await cancelPendingPayPalCheckoutByToken(token);
  }

  revalidatePath("/warenkorb");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
  revalidatePath("/produkte");
  revalidatePath("/admin/orders");

  const res = NextResponse.redirect(`${origin}/checkout?paypal=abbruch`);
  if (draft) appendCheckoutFormDraftCookie(res, draft);
  return res;
}
