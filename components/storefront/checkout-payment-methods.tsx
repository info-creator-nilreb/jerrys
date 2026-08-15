"use client";

import { CreditCard } from "lucide-react";
import Image from "next/image";
import { useId, type ReactNode } from "react";
import { checkoutPaymentMethodHint } from "@/lib/checkout/checkout-payment-hints";
import { showCheckoutInlineCardFields } from "@/lib/checkout/inline-card-fields";

/**
 * Zahlungsarten im Checkout. Apple Pay / Google Pay werden im regulären Checkout
 * nativ (Wallet-Sheet) abgeschlossen — nicht über die PayPal-Website.
 */
export const CHECKOUT_PAYPAL_METHOD_ROWS = [
  { id: "paypal", label: "PayPal", brand: "paypal" as const },
  { id: "apple_pay", label: "Apple Pay", brand: "apple_pay" as const },
  { id: "google_pay", label: "Google Pay", brand: "google_pay" as const },
  { id: "sepa", label: "SEPA Lastschrift", brand: "sepa" as const },
  { id: "card", label: "Debit- oder Kreditkarte", brand: "card" as const },
] as const;

export type CheckoutPayPalMethodId = (typeof CHECKOUT_PAYPAL_METHOD_ROWS)[number]["id"];

/** Einheitliche Breite für alle Marken-Slots (Shopify-ähnliche Spalte). */
const BRAND_SLOT =
  "flex h-8 w-[6.25rem] shrink-0 items-center justify-center overflow-hidden rounded border px-1.5";

function MethodBrand({ brand }: { brand: (typeof CHECKOUT_PAYPAL_METHOD_ROWS)[number]["brand"] }) {
  if (brand === "paypal") {
    return (
      <span className={`${BRAND_SLOT} border-[#e5e7eb] bg-white`}>
        <Image
          src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
          alt=""
          width={74}
          height={46}
          className="max-h-5 w-full max-w-[4.5rem] object-contain object-center"
        />
      </span>
    );
  }
  if (brand === "apple_pay") {
    return (
      <span className={`${BRAND_SLOT} border-[#1f2937] bg-black text-[9px] font-semibold leading-tight tracking-tight text-white`}>
        Apple&nbsp;Pay
      </span>
    );
  }
  if (brand === "google_pay") {
    return (
      <span className={`${BRAND_SLOT} border-[#e5e7eb] bg-white text-[9px] font-semibold leading-tight text-[#202124]`}>
        Google&nbsp;Pay
      </span>
    );
  }
  if (brand === "sepa") {
    return (
      <span className={`${BRAND_SLOT} border-[#e5e7eb] bg-white text-[10px] font-semibold tracking-wide text-[#003087]`}>
        SEPA
      </span>
    );
  }
  return (
    <span className={`${BRAND_SLOT} border-[#e5e7eb] bg-[#1a1a1a] text-white`}>
      <CreditCard className="size-4" aria-hidden strokeWidth={1.75} />
    </span>
  );
}

export function CheckoutPaymentMethods({
  value,
  onChange,
  submitLabel = "Jetzt kostenpflichtig bestellen",
  cardInline = true,
  cardFields = null,
  nativeWallets = false,
  applePayReady,
  googlePayReady,
}: {
  value: CheckoutPayPalMethodId;
  onChange: (id: CheckoutPayPalMethodId) => void;
  /** Button-Text in den Hinweiszeilen (z. B. Termin-Checkout). */
  submitLabel?: string;
  /**
   * false = Karte wird nach dem Absenden bei PayPal gewählt (MPA ohne Hosted Card Fields),
   * true = Kartendaten direkt im Checkout (Advanced Card Fields).
   */
  cardInline?: boolean;
  /**
   * Hosted Card Fields: unter der Karten-Option, noch in der Zahlungssektion —
   * AGB und Bestellbutton folgen danach wie bei den anderen Zahlungsarten.
   */
  cardFields?: ReactNode;
  /** true = Apple Pay / Google Pay als native Wallets (kein PayPal-Redirect). */
  nativeWallets?: boolean;
  applePayReady?: boolean;
  googlePayReady?: boolean;
}) {
  const hintId = useId();
  const rows = nativeWallets
    ? CHECKOUT_PAYPAL_METHOD_ROWS
    : CHECKOUT_PAYPAL_METHOD_ROWS.filter((row) => row.id !== "apple_pay" && row.id !== "google_pay");

  const hint = checkoutPaymentMethodHint({
    method: value,
    submitLabel,
    cardInline,
    nativeWallets,
    applePayReady,
    googlePayReady,
  });

  return (
    <div className="mt-4 w-full">
      <fieldset className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white p-0">
        <legend className="sr-only">Zahlungsart</legend>
        {rows.map((row, i) => {
          const selected = value === row.id;
          const showCardFields = showCheckoutInlineCardFields(
            row.id,
            value,
            cardInline,
            Boolean(cardFields),
          );
          return (
            <div
              key={row.id}
              className={`${selected ? "bg-[#f9fafb]" : ""} ${
                i < rows.length - 1 ? "border-b border-[#e5e7eb]" : ""
              }`}
            >
              <label
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#fafafa] ${
                  selected ? "bg-[#f9fafb]" : ""
                }`}
              >
                <input
                  type="radio"
                  name="checkoutPayPalSurface"
                  className="size-4 shrink-0 accent-primary"
                  checked={selected}
                  onChange={() => onChange(row.id)}
                  aria-describedby={hintId}
                />
                <span className="min-w-0 flex-1 text-sm text-[#1f2937]">{row.label}</span>
                <MethodBrand brand={row.brand} />
              </label>
              {showCardFields ? cardFields : null}
            </div>
          );
        })}
      </fieldset>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-[#6b7280]">
        {hint}
      </p>
    </div>
  );
}
