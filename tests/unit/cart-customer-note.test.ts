import { beforeEach, describe, expect, it, vi } from "vitest";

const getCartIdFromCookie = vi.fn();
const cartUpdate = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

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
  revalidatePath.mockReset();
  cartUpdate.mockResolvedValue({});
});

describe("updateCartCustomerNote", () => {
  it("speichert getrimmte Notiz am Warenkorb", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");
    const { updateCartCustomerNote } = await import("@/lib/cart/actions");

    const fd = new FormData();
    fd.set("note", "  Bitte an der Tür klingeln  ");

    const result = await updateCartCustomerNote(null, fd);

    expect(result).toEqual({ ok: true });
    expect(cartUpdate).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { customerNote: "Bitte an der Tür klingeln" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/warenkorb");
    expect(revalidatePath).toHaveBeenCalledWith("/checkout");
  });

  it("setzt leere Notiz auf null", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");
    const { updateCartCustomerNote } = await import("@/lib/cart/actions");

    const fd = new FormData();
    fd.set("note", "   ");

    const result = await updateCartCustomerNote(null, fd);

    expect(result).toEqual({ ok: true });
    expect(cartUpdate).toHaveBeenCalledWith({
      where: { id: "cart-1" },
      data: { customerNote: null },
    });
  });

  it("meldet Fehler wenn kein Warenkorb-Cookie gesetzt ist", async () => {
    getCartIdFromCookie.mockResolvedValue(null);
    const { updateCartCustomerNote } = await import("@/lib/cart/actions");

    const result = await updateCartCustomerNote(null, new FormData());

    expect(result).toEqual({
      ok: false,
      error: "Warenkorb nicht gefunden. Bitte Seite neu laden.",
    });
    expect(cartUpdate).not.toHaveBeenCalled();
  });

  it("meldet Fehler bei DB-Ausfall", async () => {
    getCartIdFromCookie.mockResolvedValue("cart-1");
    cartUpdate.mockRejectedValue(new Error("db down"));
    const { updateCartCustomerNote } = await import("@/lib/cart/actions");

    const fd = new FormData();
    fd.set("note", "Test");

    const result = await updateCartCustomerNote(null, fd);

    expect(result).toEqual({
      ok: false,
      error: "Notiz konnte nicht gespeichert werden. Bitte erneut versuchen.",
    });
  });
});
