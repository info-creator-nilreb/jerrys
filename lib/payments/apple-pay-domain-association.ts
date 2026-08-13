import { readFileSync } from "node:fs";
import { join } from "node:path";
import { paypalApiEnv } from "@/lib/payments/paypal-config";

/**
 * PayPal-Domain-Association für Apple Pay on the Web.
 * Offizielle Dateien:
 * - live: https://www.paypalobjects.com/devdoc/apple-pay/well-known/apple-developer-merchantid-domain-association
 * - sandbox: https://www.paypalobjects.com/devdoc/apple-pay/sandbox/apple-developer-merchantid-domain-association
 *
 * Override: `APPLE_PAY_DOMAIN_ASSOCIATION` (Rohinhalt der Datei), falls PayPal
 * eine merchant-spezifische Variante ausliefert.
 */
export function applePayDomainAssociationBody(): string {
  const fromEnv = process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim();
  if (fromEnv) return fromEnv;

  const file =
    paypalApiEnv() === "live"
      ? "apple-pay-domain-association-live.txt"
      : "apple-pay-domain-association-sandbox.txt";

  return readFileSync(join(process.cwd(), "lib/payments", file), "utf8");
}
