"use client";

import { useId } from "react";

/**
 * Darstellung der über PayPal / Advanced Checkout typischerweise verfügbaren Wege.
 * Die finale Auswahl (z. B. Apple Pay vs. Karte) erfolgt auf der PayPal-Seite nach dem Formular-Submit.
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
        <img
          src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
          alt=""
          width={74}
          height={46}
          className="max-h-5 w-full max-w-[4.5rem] object-contain object-center"
          decoding="async"
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
    <span className={`${BRAND_SLOT} border-[#e5e7eb] bg-[#1a1a1a]`}>
      <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden className="text-white">
        <rect x="0.5" y="0.5" width="21" height="15" rx="2" stroke="currentColor" strokeOpacity="0.35" />
        <rect x="1" y="3" width="20" height="3" fill="currentColor" fillOpacity="0.25" />
      </svg>
    </span>
  );
}

export function CheckoutPaymentMethods({
  value,
  onChange,
}: {
  value: CheckoutPayPalMethodId;
  onChange: (id: CheckoutPayPalMethodId) => void;
}) {
  const hintId = useId();

  const hint =
    value === "card" ? (
      <>
        Geben Sie unten Ihre Kartendaten ein (sichere Felder von PayPal) und schließen Sie mit{" "}
        <span className="font-medium text-[#374151]">„Jetzt kostenpflichtig bestellen“</span> ab.
      </>
    ) : (
      <>
        Nach „Jetzt kostenpflichtig bestellen“ leiten wir Sie zu PayPal weiter. Dort wählen Sie die für Sie
        verfügbare Option (je nach Land, Gerät und Konto, u. a. PayPal-Guthaben, Apple Pay, Google Pay, Karte oder
        SEPA).
      </>
    );

  return (
    <div className="mt-4 max-w-lg">
      <fieldset className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white p-0">
        <legend className="sr-only">Mögliche Zahlungswege über PayPal</legend>
        {CHECKOUT_PAYPAL_METHOD_ROWS.map((row, i) => (
          <label
            key={row.id}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#fafafa] ${
              value === row.id ? "bg-[#f9fafb]" : ""
            } ${i < CHECKOUT_PAYPAL_METHOD_ROWS.length - 1 ? "border-b border-[#e5e7eb]" : ""}`}
          >
            <input
              type="radio"
              name="checkoutPayPalSurface"
              className="size-4 shrink-0 accent-primary"
              checked={value === row.id}
              onChange={() => onChange(row.id)}
              aria-describedby={hintId}
            />
            <span className="min-w-0 flex-1 text-sm text-[#1f2937]">{row.label}</span>
            <MethodBrand brand={row.brand} />
          </label>
        ))}
      </fieldset>
      <p id={hintId} className="mt-2 text-xs leading-relaxed text-[#6b7280]">
        {hint}
      </p>
    </div>
  );
}
