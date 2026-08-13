import { Suspense } from "react";
import { HeaderCartFlyout } from "@/components/storefront/header-cart-flyout";
import { CartIcon } from "@/components/storefront/cart-icon";
import { getStorefrontCartBadgeCount } from "@/lib/cart/badge";

function CartIconFallback() {
  return (
    <span
      className="relative z-[500001] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading)"
      aria-hidden
    >
      <CartIcon className="size-7" />
    </span>
  );
}

async function HeaderCartWithBadge() {
  const cartBadgeCount = await getStorefrontCartBadgeCount();
  return <HeaderCartFlyout cartBadgeCount={cartBadgeCount} />;
}

/** Cookie-/DB-Badge hinter Suspense, damit Header-Shell ohne Warenkorb-Await streamen kann. */
export function HeaderCartLink() {
  return (
    <Suspense fallback={<CartIconFallback />}>
      <HeaderCartWithBadge />
    </Suspense>
  );
}
