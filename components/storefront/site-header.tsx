import Image from "next/image";
import Link from "next/link";
import { HeaderCartFlyout } from "@/components/storefront/header-cart-flyout";
import { getStorefrontCartBadgeCount } from "@/lib/cart/badge";

/** Natürliche Logo-Größe (JPEG, Seitenverhältnis 2:1) */
const LOGO_W = 256;
const LOGO_H = 128;

export async function SiteHeader() {
  const cartCount = await getStorefrontCartBadgeCount();

  return (
    <header className="fixed top-0 right-0 left-0 z-[500000] border-b border-(--surface-muted) bg-white">
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
        <HeaderCartFlyout cartBadgeCount={cartCount} />
      </div>
    </header>
  );
}
