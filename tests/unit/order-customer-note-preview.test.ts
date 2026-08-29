import { describe, expect, it } from "vitest";
import { orderCustomerNotePreview } from "@/lib/orders/order-customer-note-preview";

describe("orderCustomerNotePreview", () => {
  it("gibt null für leere Notizen zurück", () => {
    expect(orderCustomerNotePreview(null)).toBeNull();
    expect(orderCustomerNotePreview("")).toBeNull();
    expect(orderCustomerNotePreview("   ")).toBeNull();
  });

  it("normalisiert Whitespace", () => {
    expect(orderCustomerNotePreview("  Hallo\n  Welt  ")).toBe("Hallo Welt");
  });

  it("kürzt lange Notizen", () => {
    const preview = orderCustomerNotePreview("a".repeat(80), 20);
    expect(preview).toHaveLength(20);
    expect(preview?.endsWith("…")).toBe(true);
  });
});
