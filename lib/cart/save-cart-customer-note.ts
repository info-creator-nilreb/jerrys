import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getPrisma } from "@/lib/db/prisma";

export type CartNoteSaveResult = { ok: true } | { ok: false; error: string };

const NO_CART_ERROR = "Warenkorb nicht gefunden. Bitte Seite neu laden.";
const SAVE_FAILED_ERROR = "Notiz konnte nicht gespeichert werden. Bitte erneut versuchen.";

export function normalizeCartCustomerNote(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, 5000);
}

/** Persistiert die Kundennotiz am Cookie-Warenkorb (ohne RSC-Revalidierung). */
export async function saveCartCustomerNote(noteRaw: string): Promise<CartNoteSaveResult> {
  const cartId = await getCartIdFromCookie();
  if (!cartId) {
    return { ok: false, error: NO_CART_ERROR };
  }

  const note = normalizeCartCustomerNote(noteRaw);

  try {
    await getPrisma().cart.update({
      where: { id: cartId },
      data: { customerNote: note },
    });
  } catch {
    return { ok: false, error: SAVE_FAILED_ERROR };
  }

  return { ok: true };
}
