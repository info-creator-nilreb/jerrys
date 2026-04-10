export type ProductQuantityRules = {
  stockQuantity: number;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
};

/** Prüft, ob `quantity` den Staffel-/Mindest-/Max-Regeln entspricht (und Lager, falls begrenzt). */
export function isValidCartQuantity(product: ProductQuantityRules, quantity: number): boolean {
  if (!Number.isInteger(quantity) || quantity < 1) return false;
  if (quantity < product.minOrderQty) return false;
  if ((quantity - product.minOrderQty) % product.purchaseStep !== 0) return false;
  if (product.maxOrderQty != null && quantity > product.maxOrderQty) return false;
  if (product.stockQuantity < quantity) return false;
  return true;
}

/**
 * Nächste gültige Menge ab `desired` (aufwärts), oder `null` wenn unmöglich (z. B. kein Lager).
 */
export function clampToValidQuantity(product: ProductQuantityRules, desired: number): number | null {
  if (product.stockQuantity < product.minOrderQty) return null;
  let q = Math.max(desired, product.minOrderQty);
  const rem = (q - product.minOrderQty) % product.purchaseStep;
  if (rem !== 0) q += product.purchaseStep - rem;
  if (product.maxOrderQty != null && q > product.maxOrderQty) {
    const max = product.maxOrderQty;
    if (!isValidCartQuantity(product, max)) return null;
    q = max;
  }
  if (q > product.stockQuantity) {
    const cap = product.stockQuantity;
    if (cap < product.minOrderQty) return null;
    let q2 = Math.min(q, cap);
    const r2 = (q2 - product.minOrderQty) % product.purchaseStep;
    if (r2 !== 0) q2 -= r2;
    if (q2 < product.minOrderQty) return null;
    return q2;
  }
  return isValidCartQuantity(product, q) ? q : null;
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
