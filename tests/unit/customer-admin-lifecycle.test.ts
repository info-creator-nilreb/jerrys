import { describe, expect, it } from "vitest";
import {
  customerAdminDeleteBlocker,
  customerIsDeletable,
} from "@/lib/admin/customer-admin-delete-rules";

describe("customerAdminDeleteBlocker", () => {
  const guestAccount = {
    exists: false,
    verified: false,
    active: false,
    anonymized: false,
    createdAt: null,
    lastLoginAt: null,
    linkedOrderCount: 0,
  };

  const activeAccount = {
    ...guestAccount,
    exists: true,
    active: true,
    verified: true,
    createdAt: new Date(),
    linkedOrderCount: 2,
  };

  const importOrder = {
    id: "o1",
    orderNumber: "#1042",
    idempotencyKey: "shopify-order:123",
    invoiceNumber: null,
    payments: [] as { status: string }[],
  };

  it("erlaubt Gast mit nur Import-Bestellungen", () => {
    expect(customerAdminDeleteBlocker(guestAccount, [importOrder])).toBeNull();
    expect(customerIsDeletable(guestAccount, [importOrder])).toBe(true);
  });

  it("blockiert bei aktivem Kundenkonto", () => {
    expect(customerAdminDeleteBlocker(activeAccount, [importOrder])).toContain("Kundenkonto");
  });

  it("blockiert bei geschützter Bestellung", () => {
    expect(
      customerAdminDeleteBlocker(guestAccount, [{ ...importOrder, idempotencyKey: null }]),
    ).toContain("Shopify-Import");
  });

  it("blockiert ohne Bestellungen", () => {
    expect(customerAdminDeleteBlocker(guestAccount, [])).toContain("Keine Bestellungen");
  });
});
