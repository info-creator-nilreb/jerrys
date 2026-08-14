import type { CheckoutDeliveryMethod } from "@/lib/checkout/delivery-method";
import type { CheckoutPayPalMethodId } from "@/components/storefront/checkout-payment-methods";

export const CHECKOUT_FORM_DRAFT_STORAGE_KEY = "jerrys_checkout_form_draft";

export type CheckoutFormDraftPerson = {
  firstName: string;
  lastName: string;
  company: string;
};

export type CheckoutFormDraftAddress = {
  zip: string;
  city: string;
  line1: string;
  line2: string;
};

export type CheckoutFormDraft = {
  v: 1;
  email: string;
  phone: string;
  deliveryMethod: CheckoutDeliveryMethod;
  shippingCountry: string;
  shippingPerson: CheckoutFormDraftPerson;
  shippingAddressValues: CheckoutFormDraftAddress;
  shippingAddressId: string;
  billingDifferent: boolean;
  billingCountry: string;
  billingPerson: CheckoutFormDraftPerson;
  billingAddressValues: CheckoutFormDraftAddress;
  billingAddressId: string;
  payPalSurface: CheckoutPayPalMethodId;
  committedPromoCode: string;
  declineAutomatic: boolean;
};

export function saveCheckoutFormDraft(draft: CheckoutFormDraft): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota / private mode — Checkout ohne Draft fortsetzen.
  }
}

export function loadCheckoutFormDraft(): CheckoutFormDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutFormDraft>;
    if (parsed.v !== 1) return null;
    if (typeof parsed.email !== "string") return null;
    return parsed as CheckoutFormDraft;
  } catch {
    return null;
  }
}

export function clearCheckoutFormDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKOUT_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
