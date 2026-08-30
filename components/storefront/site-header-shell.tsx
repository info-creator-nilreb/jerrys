"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  StorefrontHeaderUiProvider,
  useStorefrontHeaderUi,
} from "@/components/storefront/storefront-header-ui";
import { SiteInfoBanner } from "@/components/storefront/site-info-banner";
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
  invertLogoOnTransparent,
  shopNavLinks,
  desktopMode,
  navPlacement,
  infoBanner,
  trailing,
}: {
  shopName: string;
  logoLightSrc: string;
  logoDarkSrc: string;
  invertLogoOnTransparent?: boolean;
  shopNavLinks: StorefrontShopNavLink[];
  desktopMode: DesktopShopNavMode;
  navPlacement: HeaderNavPlacement;
  infoBanner: {
    messages: string[];
    durationSec: number;
    href: string | null;
    bgColor: string;
  } | null;
  trailing: ReactNode;
}) {
  const { tone, setHovered } = useStorefrontHeaderUi();
  const transparent = tone === "transparent";
  const logoSrc = transparent ? logoDarkSrc : logoLightSrc;
  const invert = Boolean(transparent && invertLogoOnTransparent);
  const [logoFailed, setLogoFailed] = useState(false);
  const navUnderLogo = desktopMode === "inline" && navPlacement === "under";
  /** Unter dem Logo: links nur Mobil-Burger; Desktop-Links in der zweiten Zeile. */
  const leftNavMode: DesktopShopNavMode = navUnderLogo ? "hidden" : desktopMode;
  const heightVars = storefrontHeaderHeightVarsForNav({
    desktopMode,
    navPlacement,
    infoBannerVisible: infoBanner != null,
  });

  const logo = (
    <Link href="/" className="shrink-0" aria-label={shopName}>
      {logoFailed ? (
        <span
          className={`text-sm font-semibold tracking-tight sm:text-base ${
            transparent ? "text-white" : "text-(--foreground-heading)"
          }`}
        >
          {shopName}
        </span>
      ) : (
        <Image
          key={logoSrc}
          src={logoSrc}
          alt={shopName}
          width={LOGO_W}
          height={LOGO_H}
          className={`h-9 w-auto sm:h-10 md:h-11 ${invert ? "brightness-0 invert" : ""}`}
          sizes="(max-width:768px) 180px, 220px"
          priority
          unoptimized
          onError={() => setLogoFailed(true)}
        />
      )}
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
      data-info-banner={infoBanner ? "on" : "off"}
    >
      <div className="flex w-full flex-col">
        {infoBanner ? (
          <SiteInfoBanner
            messages={infoBanner.messages}
            durationSec={infoBanner.durationSec}
            href={infoBanner.href}
            bgColor={infoBanner.bgColor}
          />
        ) : null}
        <div className="relative flex w-full items-center gap-2 px-4 py-3 md:gap-3 md:px-6 md:py-3.5 lg:px-8 xl:px-10">
          <div className="relative z-[500002] flex min-w-11 flex-1 items-center pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            <StorefrontShopNav links={shopNavLinks} desktopMode={leftNavMode} />
          </div>
          <div className="pointer-events-none absolute inset-x-4 z-[500001] flex justify-center md:inset-x-6 lg:inset-x-8 xl:inset-x-10">
            <div className="pointer-events-auto max-w-[min(100%,11rem)] sm:max-w-[min(100%,13rem)]">
              {logo}
            </div>
          </div>
          <div className="relative z-[500002] flex shrink-0 items-center justify-end gap-0.5 sm:gap-1 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
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
  invertLogoOnTransparent = false,
  shopNavLinks,
  desktopMode,
  navPlacement = "beside",
  infoBanner = null,
  trailing,
}: {
  shopName: string;
  logoLightSrc: string;
  logoDarkSrc: string;
  invertLogoOnTransparent?: boolean;
  shopNavLinks: StorefrontShopNavLink[];
  desktopMode: DesktopShopNavMode;
  navPlacement?: HeaderNavPlacement;
  infoBanner?: {
    messages: string[];
    durationSec: number;
    href: string | null;
    bgColor: string;
  } | null;
  trailing: ReactNode;
}) {
  return (
    <StorefrontHeaderUiProvider>
      <SiteHeaderChrome
        shopName={shopName}
        logoLightSrc={logoLightSrc}
        logoDarkSrc={logoDarkSrc}
        invertLogoOnTransparent={invertLogoOnTransparent}
        shopNavLinks={shopNavLinks}
        desktopMode={desktopMode}
        navPlacement={navPlacement}
        infoBanner={infoBanner}
        trailing={trailing}
      />
    </StorefrontHeaderUiProvider>
  );
}
