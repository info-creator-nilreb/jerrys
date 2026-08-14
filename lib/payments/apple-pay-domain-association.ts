import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { paypalApiEnv } from "@/lib/payments/paypal-config";

const PAYMENTS_DIR = join(process.cwd(), "lib/payments");

/**
 * PayPal-Domain-Association für Apple Pay on the Web.
 *
 * Priorität:
 * 1. Env `APPLE_PAY_DOMAIN_ASSOCIATION` (Rohinhalt)
 * 2. Merchant-Datei aus der PayPal-Domain-Registrierung
 *    (`apple-pay-domain-association-merchant.txt`)
 * 3. Offizielle PayPal-Datei je `PAYPAL_ENV` (sandbox/live)
 *
 * @see https://developer.paypal.com/docs/checkout/apm/apple-pay/
 */
export function applePayDomainAssociationBody(): string {
  const fromEnv = process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim();
  if (fromEnv) return fromEnv;

  const merchantPath = join(PAYMENTS_DIR, "apple-pay-domain-association-merchant.txt");
  if (existsSync(merchantPath)) {
    return readFileSync(merchantPath, "utf8");
  }

  const file =
    paypalApiEnv() === "live"
      ? "apple-pay-domain-association-live.txt"
      : "apple-pay-domain-association-sandbox.txt";

  return readFileSync(join(PAYMENTS_DIR, file), "utf8");
}
