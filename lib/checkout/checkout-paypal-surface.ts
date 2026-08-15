export const CHECKOUT_PAYPAL_SURFACES = [
  "paypal",
  "card",
  "apple_pay",
  "google_pay",
  "sepa",
] as const;

export type CheckoutPayPalSurface = (typeof CHECKOUT_PAYPAL_SURFACES)[number];

export function parseCheckoutPayPalSurface(raw: unknown): CheckoutPayPalSurface {
  if (typeof raw === "string" && (CHECKOUT_PAYPAL_SURFACES as readonly string[]).includes(raw)) {
    return raw as CheckoutPayPalSurface;
  }
  return "paypal";
}

/** Vault-Token-ID aus dem Formular; leer oder ungültig → keine gespeicherte Karte. */
export function parsePayPalVaultId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const id = raw.trim();
  if (!id || id.length > 80) return undefined;
  if (!/^[0-9a-zA-Z_-]+$/.test(id)) return undefined;
  return id;
}

export function checkoutSurfaceNeedsHostedRedirect(surface: CheckoutPayPalSurface): boolean {
  return surface === "paypal" || surface === "sepa";
}

export function isCheckoutPayPalSurface(id: string): id is CheckoutPayPalSurface {
  return (CHECKOUT_PAYPAL_SURFACES as readonly string[]).includes(id);
}
