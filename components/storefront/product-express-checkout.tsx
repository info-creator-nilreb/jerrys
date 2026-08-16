"use client";

import { CheckoutExpressPayPalOnly } from "@/components/storefront/checkout-express-paypal";

type Props = {
  /** Wenn false (z. B. nicht bestellbar), Express ausblenden/hinweisen. */
  enabled?: boolean;
  productId: string;
  productVariantId: string;
  quantity: number;
  payPalConfigured: boolean;
  paypalClientId: string;
  currency: string;
  /** Brutto-Schätzung für Apple-Pay-Anzeige (Server berechnet final beim Prepare). */
  totalGrossCents: number;
  applePayStoreLabel: string;
};

/**
 * Shopify-ähnlicher Dynamic Checkout auf der PDP:
 * echte PayPal-/Apple-Pay-Buttons; vor createOrder wird der Warenkorb auf die Variante gesetzt.
 */
export function ProductExpressCheckout({
  enabled = true,
  productId,
  productVariantId,
  quantity,
  payPalConfigured,
  paypalClientId,
  currency,
  totalGrossCents,
  applePayStoreLabel,
}: Props) {
  if (!payPalConfigured) return null;

  return (
    <div className="mt-4 w-full max-w-md space-y-2.5">
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--foreground-muted)">
        Express Checkout
      </p>
      <CheckoutExpressPayPalOnly
        payPalConfigured={payPalConfigured}
        paypalClientId={paypalClientId}
        currency={currency}
        totalGrossCents={totalGrossCents}
        applePayStoreLabel={applePayStoreLabel}
        variant="pdp"
        enabled={enabled}
        pdpExpress={{ productId, productVariantId, quantity }}
      />
    </div>
  );
}
