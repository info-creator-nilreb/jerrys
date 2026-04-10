import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartLineCountSum } from "@/lib/cart/cart-queries";

function isDatabaseUnreachable(e: unknown): boolean {
  if (e == null || typeof e !== "object") return false;
  const o = e as { code?: unknown; message?: unknown };
  if (o.code === "P1001") return true;
  if (typeof o.message === "string" && /Can't reach database server/i.test(o.message)) {
    return true;
  }
  return false;
}

/** Summe der Stückzahlen aller Positionen (für Header-Badge). */
export async function getStorefrontCartBadgeCount(): Promise<number> {
  const id = await getCartIdFromCookie();
  if (!id) return 0;
  try {
    return await getCartLineCountSum(id);
  } catch (e) {
    if (isDatabaseUnreachable(e)) return 0;
    throw e;
  }
}
