import Image from "next/image";
import Link from "next/link";
import { getStorefrontCartBadgeCount } from "@/lib/cart/badge";
import { CartIcon } from "@/components/storefront/cart-icon";

/** Natürliche Logo-Größe (JPEG, Seitenverhältnis 2:1) */
const LOGO_W = 256;
const LOGO_H = 128;

export async function SiteHeader() {
  const cartCount = await getStorefrontCartBadgeCount();

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-(--surface-muted) bg-white">
      <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-3 md:py-3.5">
        <Link href="/">
          {/* unoptimized: direkt /public, um veraltete /_next/image?url=…png Caches zu umgehen */}
          <Image
            src="/branding/jerrys-wordmark.jpg"
            alt="jerry's"
            width={LOGO_W}
            height={LOGO_H}
            className="h-9 w-auto sm:h-10 md:h-11"
            sizes="(max-width:768px) 180px, 220px"
            priority
            unoptimized
          />
        </Link>
        <Link
          href="/warenkorb"
          className="absolute top-1/2 right-4 -translate-y-1/2 rounded-md p-2 text-(--foreground-heading) transition-colors hover:text-primary md:right-6"
          aria-label={`Warenkorb${cartCount > 0 ? `, ${cartCount} Artikel` : ""}`}
        >
          <CartIcon className="size-7" />
          {cartCount > 0 ? (
            <span className="absolute top-0.5 right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
