import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseShopifyOrderCsv,
  parseShopifyMoneyToCents,
  mapShopifyOrderToCatalog,
  mapShopifyOrderStatuses,
  shopifyOrderNumberFromName,
  planShopifyOrderCsvImport,
} from "@/features/orders";

const fixturePath = path.join(
  process.cwd(),
  "tests/fixtures/shopify-orders-sample.csv",
);

describe("parseShopifyMoneyToCents", () => {
  it("parst Dezimalbeträge", () => {
    expect(parseShopifyMoneyToCents("65.35")).toBe(6535);
    expect(parseShopifyMoneyToCents("65,35")).toBe(6535);
    expect(parseShopifyMoneyToCents("")).toBe(0);
  });
});

describe("parseShopifyOrderCsv", () => {
  it("gruppiert Mehrzeilen-Bestellungen", () => {
    const csv = fs.readFileSync(fixturePath, "utf8");
    const orders = parseShopifyOrderCsv(csv);
    expect(orders).toHaveLength(3);
    expect(orders[1]?.lineItems).toHaveLength(2);
    expect(orders[1]?.lineItems[1]?.name).toBe("Silver Bracelet");
  });
});

describe("shopifyOrderNumberFromName", () => {
  it("normalisiert Shopify-Namen", () => {
    expect(shopifyOrderNumberFromName("#1042", "")).toBe("SHOPIFY-1042");
    expect(shopifyOrderNumberFromName("", "999")).toBe("SHOPIFY-ID-999");
  });
});

describe("mapShopifyOrderStatuses", () => {
  it("mappt bezahlt + versendet auf abgeschlossen", () => {
    expect(mapShopifyOrderStatuses("paid", "fulfilled", "")).toEqual({
      status: "completed",
      fulfillmentStatus: "delivered",
    });
  });

  it("mappt Erstattung", () => {
    expect(mapShopifyOrderStatuses("refunded", "restocked", "")).toEqual({
      status: "refunded",
      fulfillmentStatus: "returned",
    });
  });
});

describe("mapShopifyOrderToCatalog", () => {
  it("mappt Pflichtfelder und Positionen", () => {
    const csv = fs.readFileSync(fixturePath, "utf8");
    const [first] = parseShopifyOrderCsv(csv);
    const mapped = mapShopifyOrderToCatalog(first!);
    expect(mapped.orderNumber).toBe("SHOPIFY-1042");
    expect(mapped.email).toBe("customer@example.com");
    expect(mapped.status).toBe("completed");
    expect(mapped.lineItems).toHaveLength(1);
    expect(mapped.errors).toHaveLength(0);
    expect(mapped.idempotencyKey).toBe("shopify-order:6123456789012");
  });

  it("warnt bei fehlender SKU", () => {
    const csv = fs.readFileSync(fixturePath, "utf8");
    const orders = parseShopifyOrderCsv(csv);
    const multi = orders[1]!;
    const mapped = mapShopifyOrderToCatalog(multi);
    expect(mapped.lineItems).toHaveLength(2);
    expect(mapped.warnings.some((w) => w.includes("ohne SKU"))).toBe(true);
  });
});

describe("planShopifyOrderCsvImport", () => {
  it("plant alle gültigen Bestellungen", () => {
    const csv = fs.readFileSync(fixturePath, "utf8");
    const planned = planShopifyOrderCsvImport(csv);
    expect(planned).toHaveLength(3);
    expect(planned.every((o) => o.errors.length === 0)).toBe(true);
  });
});
