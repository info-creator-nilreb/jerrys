/**
 * PayPal JS SDK für Express Checkout (Smart Buttons + Apple Pay).
 * Rein, damit Client und Tests dieselbe Query nutzen.
 */
export function paypalExpressSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "buttons,applepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "enable-funding": "applepay",
    "disable-funding": "card,paylater,venmo,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

/** PayPal liefert `isEligible` nicht immer; nur explizites `false` gilt als ungeeignet. */
export function isPayPalApplePayConfigEligible(
  config: { isEligible?: boolean } | null | undefined,
): boolean {
  return Boolean(config) && config.isEligible !== false;
}
