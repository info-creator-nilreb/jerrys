"use client";

import { CheckoutExpressPayPalOnly } from "@/components/storefront/checkout-express-paypal";

/**
 * Shopify-ähnlicher Express-Block oben im Checkout (PayPal / Apple Pay),
 * danach der normale Formularweg mit „oder“.
 */
export function CheckoutPageExpress({
  payPalConfigured,
  paypalClientId,
  currency,
  totalGrossCents,
  promotionCode,
  declineAutomatic,
}: {
  payPalConfigured: boolean;
  paypalClientId: string;
  currency: string;
  totalGrossCents: number;
  promotionCode?: string;
  declineAutomatic?: boolean;
}) {
  if (!payPalConfigured || !paypalClientId.trim()) return null;

  return (
    <div className="mt-6 w-full space-y-2.5">
      <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.14em] text-(--foreground-muted)">
        Express Checkout
      </p>
      <CheckoutExpressPayPalOnly
        payPalConfigured={payPalConfigured}
        paypalClientId={paypalClientId}
        currency={currency}
        totalGrossCents={totalGrossCents}
        variant="checkout"
        promotionCode={promotionCode}
        declineAutomatic={declineAutomatic}
      />
      <div className="flex items-center gap-3 pt-2" role="separator" aria-label="oder weiter mit dem Formular">
        <span className="h-px flex-1 bg-[#e5e7eb]" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">oder</span>
        <span className="h-px flex-1 bg-[#e5e7eb]" aria-hidden />
      </div>
    </div>
  );
}
