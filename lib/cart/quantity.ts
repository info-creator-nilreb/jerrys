export type ProductQuantityRules = {
  /** Verkaufbarer Bestand (Shop); physisches Lager siehe `stock_quantity` im Admin. */
  availableQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
};

/** Prüft, ob `quantity` den Staffel-/Mindest-/Max-Regeln entspricht (und verfügbarer Bestand). */
export function isValidCartQuantity(product: ProductQuantityRules, quantity: number): boolean {
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  if (quantity < product.minOrderQty) return false;
  if ((quantity - product.minOrderQty) % product.purchaseStep !== 0) return false;
  if (product.maxOrderQty != null && quantity > product.maxOrderQty) return false;
  if (product.availableQuantity < quantity) return false;
  return true;
}

/**
 * Nächste gültige Menge ab `desired` (aufwärts), oder `null` wenn unmöglich (z. B. nicht verfügbar).
 */
export function clampToValidQuantity(product: ProductQuantityRules, desired: number): number | null {
  if (product.availableQuantity < product.minOrderQty) return null;
  let q = Math.max(desired, product.minOrderQty);
  const rem = (q - product.minOrderQty) % product.purchaseStep;
  if (rem !== 0) q += product.purchaseStep - rem;
  if (product.maxOrderQty != null && q > product.maxOrderQty) {
    const max = product.maxOrderQty;
    if (!isValidCartQuantity(product, max)) return null;
    q = max;
  }
  if (q > product.availableQuantity) {
    const cap = product.availableQuantity;
    if (cap < product.minOrderQty) return null;
    let q2 = Math.min(q, cap);
    const r2 = (q2 - product.minOrderQty) % product.purchaseStep;
    if (r2 !== 0) q2 -= r2;
    if (q2 < product.minOrderQty) return null;
    return q2;
  }
  return isValidCartQuantity(product, q) ? q : null;
}

/** Obergrenze für Mengenauswahl (verfügbar und ggf. Maximalabnahme). */
export function maxSelectableQuantity(product: ProductQuantityRules): number {
  if (product.availableQuantity < product.minOrderQty) return product.minOrderQty;
  const cap =
    product.maxOrderQty != null
      ? Math.min(product.availableQuantity, product.maxOrderQty)
      : product.availableQuantity;
  return Math.max(product.minOrderQty, cap);
}

/** Menge für ersten Klick „In den Warenkorb“. */
export function defaultAddQuantity(product: ProductQuantityRules): number | null {
  return clampToValidQuantity(product, product.minOrderQty);
}

/** Menge nach weiterem Klick (Staffel erhöhen). `null`, wenn keine höhere zulässige Menge existiert. */
export function nextQuantityStep(product: ProductQuantityRules, current: number): number | null {
  const n = clampToValidQuantity(product, current + product.purchaseStep);
  if (n === null || n <= current) return null;
  return n;
}

/** Niedrigere Staffel-Menge oder Hinweis, die Position zu entfernen. */
export function previousQuantityStep(
  product: ProductQuantityRules,
  current: number,
): number | "remove" {
  if (current <= product.minOrderQty) return "remove";
  const target = current - product.purchaseStep;
  if (target < product.minOrderQty) return "remove";
  const n = clampToValidQuantity(product, target);
  if (n === null || n >= current) return "remove";
  return n;
}
