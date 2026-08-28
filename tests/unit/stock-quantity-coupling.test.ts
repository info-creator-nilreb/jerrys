import { describe, expect, it } from "vitest";
import {
  coupledStockAfterPhysicalEdit,
  coupledStockAfterZettleAdoption,
  initialCoupledStock,
  stockAdjustmentDelta,
} from "@/features/inventory";

describe("initialCoupledStock", () => {
  it("setzt verfügbar gleich physisch", () => {
    expect(initialCoupledStock(10)).toEqual({ stockQuantity: 10, availableQuantity: 10 });
  });
});

describe("coupledStockAfterPhysicalEdit", () => {
  it("erhöht verfügbar um dieselbe Delta-Menge wie physisch", () => {
    const result = coupledStockAfterPhysicalEdit({
      previousStock: 20,
      previousAvailable: 15,
      nextStock: 30,
    });
    expect(result).toEqual({
      ok: true,
      quantities: { stockQuantity: 30, availableQuantity: 25 },
    });
  });

  it("reduziert verfügbar bei physischem Abbau", () => {
    const result = coupledStockAfterPhysicalEdit({
      previousStock: 20,
      previousAvailable: 15,
      nextStock: 10,
    });
    expect(result).toEqual({
      ok: true,
      quantities: { stockQuantity: 10, availableQuantity: 5 },
    });
  });

  it("clamped verfügbar nicht unter 0", () => {
    const result = coupledStockAfterPhysicalEdit({
      previousStock: 10,
      previousAvailable: 3,
      nextStock: 0,
    });
    expect(result).toEqual({
      ok: true,
      quantities: { stockQuantity: 0, availableQuantity: 0 },
    });
  });
});

describe("coupledStockAfterZettleAdoption", () => {
  it("setzt verfügbar auf Zettle und passt physisch per Delta an", () => {
    const result = coupledStockAfterZettleAdoption({
      previousStock: 20,
      previousAvailable: 15,
      zettleBalance: 18,
    });
    expect(result).toEqual({
      ok: true,
      quantities: { stockQuantity: 23, availableQuantity: 18 },
    });
  });

  it("lehnt ab wenn physisch negativ würde", () => {
    const result = coupledStockAfterZettleAdoption({
      previousStock: 2,
      previousAvailable: 8,
      zettleBalance: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe("stockAdjustmentDelta", () => {
  it("misst Änderung am verfügbaren Bestand", () => {
    expect(
      stockAdjustmentDelta(
        { stockQuantity: 10, availableQuantity: 8 },
        { stockQuantity: 15, availableQuantity: 11 },
      ),
    ).toBe(3);
  });
});
