"use client";

import { useCallback } from "react";

export type ExpressCheckoutProvider = "paypal" | "applepay";

type Props = {
  /** Wenn false (z. B. nicht bestellbar), Buttons deaktivieren. */
  enabled?: boolean;
  /**
   * Platzhalter für spätere Anbindung (Payment Request API, Shop-Pay-Flow, …).
   * In der Entwicklung optional Logging.
   */
  onExpressCheckout?: (provider: ExpressCheckoutProvider) => void;
};

/**
 * Sekundäre Express-Kaufoptionen unter dem Haupt-CTA – rein visuell vorbereitet.
 */
export function ProductExpressCheckout({ enabled = true, onExpressCheckout }: Props) {
  const handle = useCallback(
    (provider: ExpressCheckoutProvider) => {
      onExpressCheckout?.(provider);
    },
    [onExpressCheckout],
  );

  return (
    <div className="mt-4 w-full max-w-md space-y-2.5">
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--foreground-muted)">
        Oder schnell weiter
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!enabled}
          onClick={() => handle("paypal")}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-(--surface-muted) bg-[#ffc439] px-3 text-sm font-semibold text-[#003087] shadow-sm transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Mit PayPal kaufen (in Kürze)"
        >
          PayPal
        </button>
        <button
          type="button"
          disabled={!enabled}
          onClick={() => handle("applepay")}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Mit Apple Pay kaufen (in Kürze)"
        >
          Apple Pay
        </button>
      </div>
      <p className="text-center text-xs leading-snug text-(--foreground-muted)">
        Demnächst verfügbar. Zahlung erfolgt wie gewohnt über den Warenkorb.
      </p>
    </div>
  );
}
