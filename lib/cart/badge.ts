import { getCartIdFromCookie } from "@/lib/cart/cart-cookie";
import { getCartLineCountSum } from "@/lib/cart/cart-queries";
import { isStorefrontDatabaseDegraded } from "@/lib/db/is-database-unreachable";

/** Summe der Stückzahlen aller Positionen (für Header-Badge). */
export async function getStorefrontCartBadgeCount(): Promise<number> {
  const id = await getCartIdFromCookie();
  if (!id) return 0;
  try {
    return await getCartLineCountSum(id);
  } catch (e) {
    if (isStorefrontDatabaseDegraded(e)) return 0;
    throw e;
  }
}
