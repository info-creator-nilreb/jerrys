/**
 * Platzhalter für PayPal-/Apple-Pay-Express, solange Adresse & E-Mail
 * noch aus dem Wallet kommen. Darf nie als Admin-„Kunde“ erscheinen.
 */
export const PAYPAL_EXPRESS_PLACEHOLDER_EMAIL = "paypal-express@pending.invalid";

/** Schema-gültige Dummy-Adresse (DE), bis PayPal die echte liefert. */
export const PAYPAL_EXPRESS_PLACEHOLDER_SHIPPING = {
  shippingFirstName: "Express",
  shippingLastName: "Checkout",
  shippingLine1: "Musterstrasse 1",
  shippingZip: "10115",
  shippingCity: "Berlin",
  shippingCountry: "DE",
} as const;

export function normalizeCheckoutEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPayPalExpressPlaceholderEmail(email: string): boolean {
  const n = normalizeCheckoutEmail(email);
  return (
    n === PAYPAL_EXPRESS_PLACEHOLDER_EMAIL ||
    n === "paypal-express@example.invalid" // Legacy-Platzhalter
  );
}

/**
 * Bestellungen, die noch keine echte Kundenidentität tragen
 * (Express gestartet, Checkout abgebrochen, Draft).
 */
export function orderContributesToAdminCustomer(order: {
  status: string;
  email: string;
}): boolean {
  if (isPayPalExpressPlaceholderEmail(order.email)) return false;
  if (order.status === "pending_payment" || order.status === "draft") return false;
  return true;
}
