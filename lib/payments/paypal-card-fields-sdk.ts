/** PayPal JS SDK nur für Advanced Card Fields im Checkout. */
export function paypalCardFieldsSdkSrc(clientId: string, currency: string): string {
  const p = new URLSearchParams({
    "client-id": clientId,
    components: "card-fields",
    intent: "capture",
    currency: currency.trim().toUpperCase(),
    locale: "de_DE",
  });
  return `https://www.paypal.com/sdk/js?${p.toString()}`;
}

export const PAYPAL_CARD_FIELDS_SCRIPT_ID = "paypal-js-card-fields-checkout";
export const PAYPAL_CARD_FIELDS_VAULT_SCRIPT_ID = "paypal-js-card-fields-checkout-vault";
