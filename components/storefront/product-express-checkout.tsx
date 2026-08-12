"use client";

import Link from "next/link";
import { addToCartAndRedirectToExpressCart } from "@/lib/cart/actions";

export type ExpressCheckoutProvider = "paypal" | "applepay";

type Props = {
  /** Wenn false (z. B. nicht bestellbar), Buttons deaktivieren. */
  enabled?: boolean;
  productId: string;
  productVariantId: string;
  quantity: number;
};

export function ProductExpressCheckout({
  enabled = true,
  productId,
  productVariantId,
  quantity,
}: Props) {
  return (
    <form action={addToCartAndRedirectToExpressCart} className="mt-4 w-full max-w-md space-y-2.5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productVariantId" value={productVariantId} />
      <input type="hidden" name="quantity" value={String(quantity)} />
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--foreground-muted)">
        Express Checkout
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="submit"
          name="expressProvider"
          value="paypal"
          disabled={!enabled}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-(--surface-muted) bg-[#ffc439] px-3 text-sm font-semibold text-[#003087] shadow-sm transition hover:brightness-[1.02] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Variante in den Warenkorb legen und PayPal Express starten"
        >
          PayPal
        </button>
        <button
          type="submit"
          name="expressProvider"
          value="applepay"
          disabled={!enabled}
          className="flex min-h-[2.75rem] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Variante in den Warenkorb legen und Apple Pay Express starten"
        >
          Apple Pay
        </button>
      </div>
      <p className="text-center text-xs leading-snug text-(--foreground-muted)">
        Legt die Variante in den Warenkorb und öffnet dort den echten Express-Checkout. Mit der Zahlung gelten{" "}
        <Link href="/agb" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          AGB
        </Link>{" "}
        und{" "}
        <Link href="/widerruf" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          Widerruf
        </Link>
        .
      </p>
    </form>
  );
}
