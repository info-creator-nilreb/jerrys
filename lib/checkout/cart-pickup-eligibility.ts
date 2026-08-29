/** Abholung nur, wenn alle Warenkorb-Artikel Abholung erlauben. */
export function cartAllowsPickup(
  lines: ReadonlyArray<{ product: { pickupAvailable: boolean } }>,
): boolean {
  return lines.length > 0 && lines.every((line) => line.product.pickupAvailable);
}
