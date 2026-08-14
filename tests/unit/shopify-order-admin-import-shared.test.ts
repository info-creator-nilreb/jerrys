import { describe, expect, it } from "vitest";
import {
  adminOrderImportLimitMessage,
  trimOrdersForAdminPreview,
  SHOPIFY_ORDER_IMPORT_ADMIN_MAX_ORDERS,
} from "@/app/admin/(dashboard)/einstellungen/importe/bestellungen/import-shared";

describe("trimOrdersForAdminPreview", () => {
  it("lässt kleine Listen unverändert", () => {
    const orders = [{ orderNumber: "A", status: "would_create" as const, shopifyName: "", email: "", errors: [], warnings: [], lineCount: 1 }];
    const result = trimOrdersForAdminPreview(orders, 10);
    expect(result.ordersTruncated).toBe(false);
    expect(result.orders).toHaveLength(1);
  });

  it("priorisiert ungültige Zeilen und kürzt den Rest", () => {
    const orders = Array.from({ length: 150 }, (_, i) => ({
      orderNumber: `O-${i}`,
      status: (i < 5 ? "invalid" : "would_create") as "invalid" | "would_create",
      shopifyName: "",
      email: "",
      errors: i < 5 ? ["x"] : [],
      warnings: [],
      lineCount: 1,
    }));
    const result = trimOrdersForAdminPreview(orders, 20);
    expect(result.ordersTruncated).toBe(true);
    expect(result.ordersShown).toBe(20);
    expect(result.orders.filter((o) => o.status === "invalid")).toHaveLength(5);
  });
});

describe("adminOrderImportLimitMessage", () => {
  it("nennt CLI und Admin-Limit", () => {
    const msg = adminOrderImportLimitMessage(21076);
    expect(msg).toContain("21.076");
    expect(msg).toContain(String(SHOPIFY_ORDER_IMPORT_ADMIN_MAX_ORDERS));
    expect(msg).toContain("orders:import-shopify");
  });
});
