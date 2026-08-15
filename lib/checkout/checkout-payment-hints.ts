import type { CheckoutPayPalMethodId } from "@/components/storefront/checkout-payment-methods";

export function isCheckoutWalletMethod(id: CheckoutPayPalMethodId): boolean {
  return id === "apple_pay" || id === "google_pay";
}

export function checkoutPaymentMethodHint(input: {
  method: CheckoutPayPalMethodId;
  submitLabel: string;
  cardInline: boolean;
  nativeWallets: boolean;
  applePayReady?: boolean;
  googlePayReady?: boolean;
}): string {
  const { method, submitLabel } = input;
  if (method === "card" && input.cardInline) {
    return `Geben Sie Ihre Kartendaten ein (sichere Felder von PayPal) und schließen Sie mit „${submitLabel}“ ab.`;
  }
  if (method === "card") {
    return `Nach „${submitLabel}“ leiten wir Sie zu PayPal weiter. Dort können Sie mit Debit- oder Kreditkarte bezahlen.`;
  }
  if (method === "paypal") {
    return `Nach „${submitLabel}“ leiten wir Sie zu PayPal weiter, um mit Ihrem PayPal-Konto zu bezahlen.`;
  }
  if (method === "sepa") {
    return `Nach „${submitLabel}“ leiten wir Sie zu PayPal weiter, um die SEPA-Lastschrift zu bestätigen.`;
  }
  if (method === "apple_pay") {
    if (!input.nativeWallets) {
      return `Apple Pay steht in diesem Checkout nicht zur Verfügung. Bitte PayPal, Karte oder SEPA wählen.`;
    }
    if (input.applePayReady === false) {
      return "Apple Pay ist auf diesem Gerät nicht verfügbar. Bitte Safari auf einem Apple-Gerät nutzen oder eine andere Zahlungsart wählen.";
    }
    return `Nach „${submitLabel}“ öffnet sich Apple Pay auf diesem Gerät. Es erfolgt keine Weiterleitung zur PayPal-Website.`;
  }
  if (method === "google_pay") {
    if (!input.nativeWallets) {
      return `Google Pay steht in diesem Checkout nicht zur Verfügung. Bitte PayPal, Karte oder SEPA wählen.`;
    }
    if (input.googlePayReady === false) {
      return "Google Pay ist auf diesem Gerät nicht verfügbar. Bitte eine andere Zahlungsart wählen.";
    }
    return `Nach „${submitLabel}“ öffnet sich Google Pay auf diesem Gerät. Es erfolgt keine Weiterleitung zur PayPal-Website.`;
  }
  return "";
}
