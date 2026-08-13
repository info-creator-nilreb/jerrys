"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  StorefrontHeaderUiProvider,
  useStorefrontHeaderUi,
} from "@/components/storefront/storefront-header-ui";
import {
  StorefrontShopNav,
  StorefrontShopNavInlineLinks,
} from "@/components/storefront/storefront-shop-nav";
import type {
  DesktopShopNavMode,
  HeaderNavPlacement,
} from "@/lib/shop/shop-settings-defaults";
import { storefrontHeaderHeightVarsForNav } from "@/lib/storefront/page-below-header-padding";
import type { StorefrontShopNavLink } from "@/lib/storefront/shop-nav-links";

const LOGO_W = 256;
const LOGO_H = 128;

function SiteHeaderChrome({
  shopName,
  logoLightSrc,
  logoDarkSrc,
  shopNavLinks,
  desktopMode,
  navPlacement,
  trailing,
}: {
  shopName: string;
  logoLightSrc: string;
  logoDarkSrc: string;
  shopNavLinks: StorefrontShopNavLink[];
  desktopMode: DesktopShopNavMode;
  navPlacement: HeaderNavPlacement;
  trailing: ReactNode;
}) {
  const { tone, setHovered } = useStorefrontHeaderUi();
  const transparent = tone === "transparent";
  const logoSrc = transparent ? logoDarkSrc : logoLightSrc;
  const navUnderLogo = desktopMode === "inline" && navPlacement === "under";
  /** Unter dem Logo: links nur Mobil-Burger; Desktop-Links in der zweiten Zeile. */
  const leftNavMode: DesktopShopNavMode = navUnderLogo ? "hidden" : desktopMode;
  const heightVars = storefrontHeaderHeightVarsForNav({
    desktopMode,
    navPlacement,
  });

  const logo = (
    <Link href="/" className="shrink-0" aria-label={shopName}>
      <Image
        key={logoSrc}
        src={logoSrc}
        alt={shopName}
        width={LOGO_W}
        height={LOGO_H}
        className="h-9 w-auto sm:h-10 md:h-11"
        sizes="(max-width:768px) 180px, 220px"
        priority
        unoptimized
      />
    </Link>
  );

  return (
    <header
      className={`${heightVars} fixed top-0 right-0 left-0 z-[500000] border-b transition-[background-color,border-color,box-shadow] duration-200 ease-out ${
        transparent
          ? "border-transparent bg-transparent"
          : "border-(--surface-muted) bg-white shadow-[0_1px_0_rgb(0,0,0,0.03)]"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-header-tone={tone}
      data-nav-placement={navUnderLogo ? "under" : "beside"}
    >
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-3.5 lg:px-8 xl:px-10">
          <div className="flex min-w-0 flex-1 items-center">
            <StorefrontShopNav links={shopNavLinks} desktopMode={leftNavMode} />
          </div>
          {logo}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:gap-1">
            {trailing}
          </div>
        </div>
        {navUnderLogo ? (
          <div className="hidden px-4 pb-2.5 md:block md:px-6 lg:px-8 xl:px-10">
            <StorefrontShopNavInlineLinks links={shopNavLinks} className="block" />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SiteHeaderShell({
  shopName,
  logoLightSrc,
  logoDarkSrc,
  shopNavLinks,
  desktopMode,
  navPlacement = "beside",
  trailing,
}: {
  shopName: string;
  logoLightSrc: string;
  logoDarkSrc: string;
  shopNavLinks: StorefrontShopNavLink[];
  desktopMode: DesktopShopNavMode;
  navPlacement?: HeaderNavPlacement;
  trailing: ReactNode;
}) {
  return (
    <StorefrontHeaderUiProvider>
      <SiteHeaderChrome
        shopName={shopName}
        logoLightSrc={logoLightSrc}
        logoDarkSrc={logoDarkSrc}
        shopNavLinks={shopNavLinks}
        desktopMode={desktopMode}
        navPlacement={navPlacement}
        trailing={trailing}
      />
    </StorefrontHeaderUiProvider>
  );
}
