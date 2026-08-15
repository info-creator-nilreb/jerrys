const EXPRESS_DISABLE_FUNDING =
  "card,paylater,venmo,sepa,bancontact,blik,eps,giropay,ideal,mybank,p24,sofort";

/**
 * PayPal JS SDK für Express Checkout (Smart Buttons + Apple Pay).
 * Ohne `googlepay`: ist Google Pay beim Händler nicht aktiv, lehnt PayPal das
 * gesamte Skript ab — Express zeigt dann „Skript konnte nicht geladen werden“.
 */
export function paypalExpressSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "buttons,applepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "enable-funding": "applepay",
    "disable-funding": EXPRESS_DISABLE_FUNDING,
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

/**
 * Fallback, falls `applepay` als Komponente das Express-Skript blockiert
 * (Händler ohne Apple-Pay-Freischaltung).
 */
export function paypalExpressButtonsOnlySdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "buttons",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "disable-funding": EXPRESS_DISABLE_FUNDING,
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

/** Fallback, falls Google Pay als Komponente das Wallet-Skript blockiert. */
export function paypalCheckoutApplePaySdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "applepay",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
    "enable-funding": "applepay",
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
