"use server";

import { redirect } from "next/navigation";
import { createPendingPayPalOrderFromFormData } from "@/lib/checkout/create-pending-paypal-order-from-form";
import { setCheckoutFormDraftCookieFromServer } from "@/lib/checkout/checkout-form-draft-cookie";

export type CheckoutActionState =
  | { ok: true; orderNumber: string; paymentRedirectUrl?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

/**
 * Nach erfolgreichem Pending-PayPal-Start immer `redirect()` nutzen (Approval-URL).
 * Der Warenkorb bleibt bis zum erfolgreichen Capture erhalten (PayPal-Abbruch → erneut checkouten).
 */
export async function submitCheckout(
  _prev: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const r = await createPendingPayPalOrderFromFormData(formData);

  if (!r.ok) {
    return { ok: false, error: r.error, fieldErrors: r.fieldErrors };
  }

  if (r.paymentReady && r.checkoutDraft) {
    await setCheckoutFormDraftCookieFromServer(r.checkoutDraft);
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
