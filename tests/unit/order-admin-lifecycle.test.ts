import { describe, expect, it } from "vitest";
import {
  orderAdminDeleteBlocker,
  shopifyImportIdempotencyKey,
} from "@/features/orders/application/order-admin-lifecycle";

describe("shopifyImportIdempotencyKey", () => {
  it("erkennt Shopify-Import-Schlüssel", () => {
    expect(shopifyImportIdempotencyKey("shopify-order:123")).toBe(true);
    expect(shopifyImportIdempotencyKey(null)).toBe(false);
  });
});

describe("orderAdminDeleteBlocker", () => {
  const base = {
    id: "o1",
    orderNumber: "#1042",
    idempotencyKey: "shopify-order:123",
    invoiceNumber: null,
    payments: [] as { status: string }[],
  };

  it("erlaubt Shopify-Import ohne Rechnung", () => {
    expect(orderAdminDeleteBlocker(base)).toBeNull();
  });

  it("blockiert echte Shop-Bestellungen", () => {
    expect(orderAdminDeleteBlocker({ ...base, idempotencyKey: null })).toContain(
      "Shopify-Import",
    );
  });

  it("blockiert bei Rechnung", () => {
    expect(orderAdminDeleteBlocker({ ...base, invoiceNumber: "RE-2026-001" })).toContain(
      "Rechnung",
    );
  });

  it("blockiert bei erfasster Zahlung", () => {
    expect(
      orderAdminDeleteBlocker({ ...base, payments: [{ status: "succeeded" }] }),
    ).toContain("Zahlung");
  });
});
