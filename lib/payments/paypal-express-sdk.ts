/**
 * PayPal JS SDK für Express Checkout (Smart Buttons + Apple Pay).
 * Rein, damit Client und Tests dieselbe Query nutzen.
 */
export function paypalExpressSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "buttons,applepay,googlepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "enable-funding": "applepay,googlepay",
    "disable-funding": "card,paylater,venmo,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

/** PayPal JS SDK für Apple Pay / Google Pay im regulären Checkout (ohne PayPal-Redirect). */
export function paypalCheckoutWalletSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "applepay,googlepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "enable-funding": "applepay,googlepay",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

/** Google Pay Web-SDK (PayPal Googlepay-Komponente braucht `PaymentsClient`). */
export const GOOGLE_PAY_JS_SRC = "https://pay.google.com/gp/p/js/pay.js";

/** PayPal liefert `isEligible` nicht immer; nur explizites `false` gilt als ungeeignet. */
export function isPayPalApplePayConfigEligible(
  config: { isEligible?: boolean } | null | undefined,
): boolean {
  if (!config) return false;
  return config.isEligible !== false;
}
