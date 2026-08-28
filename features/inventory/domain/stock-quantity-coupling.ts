export type CoupledStockQuantities = {
  stockQuantity: number;
  availableQuantity: number;
};

export type CoupledStockError = {
  ok: false;
  error: string;
};

export type CoupledStockResult = { ok: true; quantities: CoupledStockQuantities } | CoupledStockError;

/**
 * Neuanlage / Erstbestand: physisch und verfügbar starten gleich.
 */
export function initialCoupledStock(stockQuantity: number): CoupledStockQuantities {
  const stock = Math.max(0, stockQuantity);
  return { stockQuantity: stock, availableQuantity: stock };
}

/**
 * Admin-Anpassung des physischen Bestands: verfügbar bewegt sich um dieselbe Delta-Menge.
 * Erhält die Lücke zwischen Lager und verfügbar (z. B. reservierte, noch nicht versandte Online-Bestellungen).
 */
export function coupledStockAfterPhysicalEdit(input: {
  previousStock: number;
  previousAvailable: number;
  nextStock: number;
}): CoupledStockResult {
  const nextStock = Math.max(0, input.nextStock);
  const delta = nextStock - Math.max(0, input.previousStock);
  const nextAvailable = Math.max(0, input.previousAvailable + delta);
  return {
    ok: true,
    quantities: {
      stockQuantity: nextStock,
      availableQuantity: nextAvailable,
    },
  };
}

/**
 * Zettle STORE-Bestand übernehmen: verfügbar wird auf Zettle gesetzt, physisch folgt per Delta.
 */
export function coupledStockAfterZettleAdoption(input: {
  previousStock: number;
  previousAvailable: number;
  zettleBalance: number;
}): CoupledStockResult {
  if (!Number.isFinite(input.zettleBalance) || input.zettleBalance < 0) {
    return { ok: false, error: "Ungültiger Zettle-Bestand." };
  }
  const zettleBalance = Math.floor(input.zettleBalance);
  const delta = zettleBalance - Math.max(0, input.previousAvailable);
  const nextStock = Math.max(0, input.previousStock) + delta;
  if (nextStock < 0) {
    return {
      ok: false,
      error: "Übernahme würde den physischen Bestand negativ machen.",
    };
  }
  return {
    ok: true,
    quantities: {
      stockQuantity: nextStock,
      availableQuantity: zettleBalance,
    },
  };
}

export function stockAdjustmentDelta(
  previous: CoupledStockQuantities,
  next: CoupledStockQuantities,
): number {
  return next.availableQuantity - previous.availableQuantity;
}
