/** Zahlungsarten, die bei konfiguriertem Stripe über Checkout abgewickelt werden. */
export function usesStripeHostedCheckout(paymentMethod: string): boolean {
  return paymentMethod === "paypal" || paymentMethod === "klarna";
}
