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
