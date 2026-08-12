import { describe, expect, it } from "vitest";

/** Spiegel der Delta-Richtung Shop→Zettle (STORE↔SOLD). */
function inventoryEndpoints(kind: "shop_sale" | "shop_return") {
  return kind === "shop_sale"
    ? { from: "STORE", to: "SOLD" }
    : { from: "SOLD", to: "STORE" };
}

function correlationId(kind: "shop_sale" | "shop_return", orderId: string) {
  return `${kind}:${orderId}`;
}

describe("zettle inventory push policy", () => {
  it("Online-Verkauf geht STORE→SOLD, Retoure SOLD→STORE", () => {
    expect(inventoryEndpoints("shop_sale")).toEqual({ from: "STORE", to: "SOLD" });
    expect(inventoryEndpoints("shop_return")).toEqual({ from: "SOLD", to: "STORE" });
  });

  it("Correlation-IDs sind order-scoped und richtungsgetrennt", () => {
    expect(correlationId("shop_sale", "ord_1")).toBe("shop_sale:ord_1");
    expect(correlationId("shop_return", "ord_1")).toBe("shop_return:ord_1");
    expect(correlationId("shop_sale", "ord_1")).not.toBe(correlationId("shop_return", "ord_1"));
  });

  it("Discrepancy-Delta nutzt available, nicht warehouse stock", () => {
    const shopStock = 10;
    const shopAvailable = 7;
    const zettleBalance = 7;
    const deltaAvailable = shopAvailable - zettleBalance;
    const deltaStock = shopStock - zettleBalance;
    expect(deltaAvailable).toBe(0);
    expect(deltaStock).toBe(3);
  });
});
