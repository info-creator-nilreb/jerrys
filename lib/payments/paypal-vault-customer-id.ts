import { createHash } from "node:crypto";

/**
 * PayPal `customer.id` für Vault / User-ID-Token.
 * Vorgabe: 1–22 Zeichen, nur `[0-9a-zA-Z_-]`. Shop-`cuid()` ist 25 Zeichen.
 */
export function paypalVaultCustomerId(shopCustomerId: string): string {
  const id = shopCustomerId.trim();
  if (id.length >= 1 && id.length <= 22 && /^[0-9a-zA-Z_-]+$/.test(id)) {
    return id;
  }
  return createHash("sha256").update(`jerrys-pp-cust:${id}`).digest("hex").slice(0, 22);
}
