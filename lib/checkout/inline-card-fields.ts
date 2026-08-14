/** Kartenfelder nur unter der ausgewählten Karten-Option, nicht nach der AGB. */
export function showCheckoutInlineCardFields(
  rowId: string,
  selectedId: string,
  cardInline: boolean,
  hasCardFields: boolean,
): boolean {
  return rowId === "card" && selectedId === "card" && cardInline && hasCardFields;
}
