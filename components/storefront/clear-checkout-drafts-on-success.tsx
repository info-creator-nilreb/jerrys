"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCheckoutFormDraft } from "@/lib/checkout/checkout-form-draft";
import { clearCheckoutPromoPreference } from "@/lib/checkout/checkout-promo-preference";

/** Nach erfolgreicher Bestellung Drafts verwerfen und Header (Warenkorb-Badge) aktualisieren. */
export function ClearCheckoutDraftsOnSuccess() {
  const router = useRouter();

  useEffect(() => {
    clearCheckoutFormDraft();
    clearCheckoutPromoPreference();
    router.refresh();
  }, [router]);

  return null;
}
