"use client";

import { useEffect } from "react";
import { clearCheckoutFormDraft } from "@/lib/checkout/checkout-form-draft";
import { clearCheckoutPromoPreference } from "@/lib/checkout/checkout-promo-preference";

/** Nach erfolgreicher Bestellung gespeicherte Checkout-Eingaben verwerfen. */
export function ClearCheckoutDraftsOnSuccess() {
  useEffect(() => {
    clearCheckoutFormDraft();
    clearCheckoutPromoPreference();
  }, []);
  return null;
}
