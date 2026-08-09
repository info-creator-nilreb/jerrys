"use server";

import { createWorkshopOrderFromFormData } from "@/lib/checkout/create-workshop-order-from-form";

export type WorkshopCheckoutActionState =
  | { ok: true; orderNumber: string; paymentRedirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

/**
 * Termin-Checkout über `useActionState` — kein `redirect()` (React #441 in Production).
 * Erfolg: Client navigiert zu `paymentRedirectUrl`.
 */
export async function submitWorkshopCheckout(
  _prev: WorkshopCheckoutActionState,
  formData: FormData,
): Promise<WorkshopCheckoutActionState> {
  const r = await createWorkshopOrderFromFormData(formData);

  if (!r.ok) {
    return { ok: false, error: r.error, fieldErrors: r.fieldErrors };
  }

  const erfolgPath = `/checkout/erfolg?nr=${encodeURIComponent(r.orderNumber)}`;

  if (!r.paymentReady) {
    return { ok: true, orderNumber: r.orderNumber, paymentRedirectUrl: erfolgPath };
  }

  const approval = r.approvalUrl?.trim();
  if (approval) {
    return { ok: true, orderNumber: r.orderNumber, paymentRedirectUrl: approval };
  }

  return { ok: true, orderNumber: r.orderNumber, paymentRedirectUrl: erfolgPath };
}
