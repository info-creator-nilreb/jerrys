/** Anzeigename für Zahlungsmethoden (Storefront + E-Mails; client-sicher). */
export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "vorkasse":
      return "Vorkasse";
    case "paypal":
      return "PayPal";
    case "klarna":
      return "Klarna";
    default:
      return method;
  }
}

/** @deprecated Alias — bitte `paymentMethodLabel` nutzen. */
export const transactionalPaymentLabel = paymentMethodLabel;
