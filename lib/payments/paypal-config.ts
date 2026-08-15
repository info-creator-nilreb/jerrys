export type PayPalApiEnv = "sandbox" | "live";

export function paypalApiEnv(): PayPalApiEnv {
  const raw = process.env.PAYPAL_ENV?.trim().toLowerCase();
  if (raw === "live" || raw === "production") return "live";
  return "sandbox";
}

export function paypalApiBaseUrl(): string {
  return paypalApiEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPayPalConfigured(): boolean {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

/**
 * SEPA-Lastschrift als eigene Checkout-Zahlungsart (PayPal APM `sepa_debit`).
 * Standard aus: der Händler muss SEPA Direct Debit im PayPal-Dashboard aktivieren
 * und danach `PAYPAL_SEPA_DEBIT_ENABLED=1` setzen. Sonst lehnt PayPal die Order ab.
 */
export function isPayPalSepaDebitEnabled(): boolean {
  const raw = process.env.PAYPAL_SEPA_DEBIT_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}
