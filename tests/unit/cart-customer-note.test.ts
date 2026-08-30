import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeCartCustomerNote, saveCartCustomerNote } from "@/lib/cart/save-cart-customer-note";

const getCartIdFromCookie = vi.fn();
const cartUpdate = vi.fn();

vi.mock("@/lib/cart/cart-cookie", () => ({
  getCartIdFromCookie: () => getCartIdFromCookie(),
}));

vi.mock("@/lib/db/prisma", () => ({
  getPrisma: () => ({
    cart: { update: cartUpdate },
  }),
}));

beforeEach(() => {
  getCartIdFromCookie.mockReset();
  cartUpdate.mockReset();
  cartUpdate.mockResolvedValue({});
});

describe("normalizeCartCustomerNote", () => {
  it("trimmt und kürzt Notizen", () => {
    expect(normalizeCartCustomerNote("  Hallo  ")).toBe("Hallo");
    expect(normalizeCartCustomerNote("   ")).toBeNull();
    expect(normalizeCartCustomerNote("a".repeat(6000))).toHaveLength(5000);
  });
});

describe("saveCartCustomerNote", () => {
  it("speichert getrimmte Notiz am Warenkorb", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");

    const result = await saveCartCustomerNote("  Bitte an der Tür klingeln  ");

    expect(result).toEqual({ ok: true });
    expect(cartUpdate).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { customerNote: "Bitte an der Tür klingeln" },
    });
  });

  it("setzt leere Notiz auf null", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");

    const result = await saveCartCustomerNote("   ");

    expect(result).toEqual({ ok: true });
    expect(cartUpdate).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { customerNote: null },
    });
  });

  it("meldet Fehler wenn kein Warenkorb-Cookie gesetzt ist", async () => {
    getCartIdFromCookie.mockResolvedValue(null);

    const result = await saveCartCustomerNote("Test");

    expect(result).toEqual({
      ok: false,
      error: "Warenkorb nicht gefunden. Bitte Seite neu laden.",
    });
    expect(cartUpdate).not.toHaveBeenCalled();
  });

  it("meldet Fehler bei DB-Ausfall", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");
    cartUpdate.mockRejectedValue(new Error("db down"));

    const result = await saveCartCustomerNote("Test");

    expect(result).toEqual({
      ok: false,
      error: "Notiz konnte nicht gespeichert werden. Bitte erneut versuchen.",
    });
  });
});
