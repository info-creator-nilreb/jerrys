import { cookies } from "next/headers";
import { getPrisma } from "@/lib/db/prisma";
import { CART_COOKIE_NAME, CART_COOKIE_MAX_AGE } from "@/lib/cart/constants";

export async function getCartIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE_NAME)?.value ?? null;
}

/**
 * Legt bei Bedarf einen neuen Warenkorb an und setzt das httpOnly-Cookie.
 * Nur in Server Actions / Route Handlers aufrufen.
 */
export async function ensureCartIdAndCookie(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE_NAME)?.value;
  if (existing) {
    const row = await getPrisma().cart.findUnique({
      where: { id: existing },
      select: { id: true },
    });
    if (row) return existing;
  }

  const cart = await getPrisma().cart.create({ data: {} });
  jar.set(CART_COOKIE_NAME, cart.id, {
    httpOnly: true,
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return cart.id;
}
