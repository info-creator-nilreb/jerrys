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

  it("parst Semikolon-CSV (Excel/DE)", () => {
    const csv = [
      "Name;Email;Financial Status;Fulfillment Status;Created at;Currency;Subtotal;Shipping;Taxes;Total;Id;Lineitem quantity;Lineitem name;Lineitem price;Lineitem sku",
      "#2001;buyer@example.com;paid;fulfilled;2024-06-15 10:30:00 +0200;EUR;25.00;4.90;5.00;34.90;9001;1;Ohrringe Luise;25.00;",
    ].join("\n");
    const orders = parseShopifyOrderCsv(csv);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.email).toBe("buyer@example.com");
    expect(orders[0]?.lineItems[0]?.name).toBe("Ohrringe Luise");
  });

  it("gruppiert Folgezeilen mit wiederholtem Name aber ohne Id", () => {
    const csv = [
      "Name,Email,Id,Lineitem quantity,Lineitem name,Lineitem price",
      "#1043,customer@example.com,6123456789013,1,Tea Set,30.00",
      "#1043,,,1,Silver Bracelet,35.00",
      "#1044,guest@example.com,6123456789014,1,Workshop Ticket,20.00",
    ].join("\n");
    const orders = parseShopifyOrderCsv(csv);
    expect(orders).toHaveLength(2);
    expect(orders[0]?.lineItems).toHaveLength(2);
    expect(orders[0]?.lineItems[1]?.name).toBe("Silver Bracelet");
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

  it("merkt fehlende SKU für Titel-Matching vor", () => {
    const csv = fs.readFileSync(fixturePath, "utf8");
    const orders = parseShopifyOrderCsv(csv);
    const multi = orders[1]!;
    const mapped = mapShopifyOrderToCatalog(multi);
    expect(mapped.lineItems).toHaveLength(2);
    expect(mapped.warnings.some((w) => w.includes("Matching über Titel"))).toBe(true);
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
