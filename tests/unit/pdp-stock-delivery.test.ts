import { describe, expect, it } from "vitest";
import {
  pdpDeliveryTimePhrase,
  pdpStockDeliveryLine,
} from "@/lib/catalog/pdp-stock-delivery";

describe("pdpStockDeliveryLine", () => {
  it("formuliert Lieferzeit im Dativ mit „in … bei dir“", () => {
    expect(
      pdpStockDeliveryLine({
        availableQuantity: 3,
        deliveryTimeKey: "2-4-werktage",
      }),
    ).toBe("Auf Lager – voraussichtlich in 2–4 Werktagen bei dir");
  });

  it("nutzt „in … Wochen“ für Wochen-Optionen", () => {
    expect(
      pdpStockDeliveryLine({
        availableQuantity: 1,
        deliveryTimeKey: "1-2-wochen",
      }),
    ).toBe("Auf Lager – voraussichtlich in 1–2 Wochen bei dir");
  });

  it("meldet Nicht-Verfügbarkeit", () => {
    expect(
      pdpStockDeliveryLine({
        availableQuantity: 0,
        deliveryTimeKey: "2-4-werktage",
      }),
    ).toBe("Derzeit nicht auf Lager.");
  });
});

describe("pdpDeliveryTimePhrase", () => {
  it("wandelt Werktage in Werktagen", () => {
    expect(pdpDeliveryTimePhrase("1–2 Werktage")).toBe("in 1–2 Werktagen");
  });
});
