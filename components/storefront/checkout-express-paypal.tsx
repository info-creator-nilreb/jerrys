"use client";

import Link from "next/link";

const btnClass =
  "inline-flex min-h-[2.75rem] items-center justify-center rounded-md bg-[#FFC439] px-5 text-sm font-semibold text-[#003087] shadow-sm transition hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

type Props = {
  /** Ohne PayPal-Credentials kein Express-Hinweis. */
  payPalConfigured: boolean;
  /** Warenkorb: Link zum Checkout; Checkout: Scroll zu Kontakt. */
  variant?: "checkout" | "cart";
};

/**
 * Nur PayPal als Express-Shortcut (kein Shop Pay / Google Pay).
 * Ohne ausgefüllte Adresse kein PayPal-Dialog – zuerst Checkout-Daten, dann kostenpflichtig bestellen.
 */
export function CheckoutExpressPayPalOnly({ payPalConfigured, variant = "checkout" }: Props) {
  if (!payPalConfigured) return null;

  const goToCheckoutFields = () => {
    document.getElementById("checkout-section-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      document.getElementById("email")?.focus();
    });
  };

  const hint = (
    <p className="max-w-md text-xs leading-snug text-[#6b7280]">
      {variant === "cart" ? (
        <>
          Zum Checkout mit PayPal – dort Lieferadresse eingeben und{" "}
          <span className="font-medium text-[#374151]">„Jetzt kostenpflichtig bestellen“</span> wählen.
        </>
      ) : (
        <>
          Bitte Kontakt- und Lieferadresse ausfüllen, dann unten{" "}
          <span className="font-medium text-[#374151]">„Jetzt kostenpflichtig bestellen“</span> – Sie werden zu PayPal
          weitergeleitet.
        </>
      )}
    </p>
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {variant === "cart" ? (
        <Link
          href="/checkout?payment=paypal"
          className={btnClass}
          aria-label="Zum Checkout mit PayPal"
        >
          PayPal
        </Link>
      ) : (
        <button
          type="button"
          onClick={goToCheckoutFields}
          className={btnClass}
          aria-label="Mit PayPal bezahlen: zuerst Kontakt- und Lieferadresse ausfüllen"
        >
          PayPal
        </button>
      )}
      {hint}
    </div>
  );
}
