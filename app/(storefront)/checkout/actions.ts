"use server";

import { redirect } from "next/navigation";
import { createPendingPayPalOrderFromFormData } from "@/lib/checkout/create-pending-paypal-order-from-form";

export type CheckoutActionState =
  | { ok: true; orderNumber: string; paymentRedirectUrl?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

/**
 * Nach erfolgreicher Bestellung immer `redirect()` nutzen: sonst refetched Next die Checkout-RSC
 * mit bereits geleertem Warenkorb → `redirect("/warenkorb")` bevor der Client zu PayPal / Erfolg springen kann.
 */
export async function submitCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const r = await createPendingPayPalOrderFromFormData(formData);

  if (!r.ok) {
    return { ok: false, error: r.error, fieldErrors: r.fieldErrors };
  }

  const erfolgPath = `/checkout/erfolg?nr=${encodeURIComponent(r.orderNumber)}`;

  if (!r.paymentReady) {
    redirect(erfolgPath);
  }

  const approval = r.approvalUrl?.trim();
  if (approval) {
    redirect(approval);
  }

  redirect(erfolgPath);
}
