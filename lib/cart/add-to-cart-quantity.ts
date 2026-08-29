import {
  clampToValidQuantity,
  defaultAddQuantity,
  isValidCartQuantity,
  nextQuantityStep,
  type ProductQuantityRules,
} from "@/lib/cart/quantity";

export type ResolveAddToCartQuantityResult =
  | { ok: true; nextQty: number; addedQuantity: number }
  | { ok: false; error: string };

/**
 * Ermittelt die neue Warenkorb-Zeilenmenge beim Hinzufügen.
 * Explizite Menge = Stückzahl pro Klick (additiv bei bestehender Position).
 */
export function resolveAddToCartNextQuantity(
  rules: ProductQuantityRules,
  existingQuantity: number | null,
  explicitQuantity: number | null,
): ResolveAddToCartQuantityResult {
  if (explicitQuantity !== null) {
    if (!Number.isFinite(explicitQuantity) || !Number.isInteger(explicitQuantity) || explicitQuantity < 1) {
      return { ok: false, error: "Bitte eine gültige Menge eingeben." };
    }

    const baseQty = existingQuantity ?? 0;
    const targetQty = existingQuantity != null ? baseQty + explicitQuantity : explicitQuantity;
    const nextQty = clampToValidQuantity(rules, targetQty);

    if (nextQty === null || !isValidCartQuantity(rules, nextQty)) {
      return {
        ok: false,
        error: "Diese Menge ist nicht möglich (Mindestabnahme, Staffelung, Lager).",
      };
    }

    if (existingQuantity != null && nextQty <= existingQuantity) {
      return { ok: false, error: "Maximale Menge erreicht." };
    }

    return { ok: true, nextQty, addedQuantity: nextQty - baseQty };
  }

  if (existingQuantity != null) {
    const nextQty = nextQuantityStep(rules, existingQuantity);
    if (nextQty === null) {
      return { ok: false, error: "Maximale Menge erreicht." };
    }
    return { ok: true, nextQty, addedQuantity: nextQty - existingQuantity };
  }

  const nextQty = defaultAddQuantity(rules);
  if (nextQty === null) {
    return { ok: false, error: "Diese Menge ist nicht möglich (Lager oder Staffelung)." };
  }

  return { ok: true, nextQty, addedQuantity: nextQty };
}
