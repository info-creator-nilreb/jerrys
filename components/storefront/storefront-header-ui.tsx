"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type StorefrontHeaderTone = "transparent" | "solid";

type HeaderUiValue = {
  tone: StorefrontHeaderTone;
  isHomeEditorial: boolean;
  /** Icon-/Link-Farbe abhängig vom Header-Ton. */
  controlClassName: string;
  navInactiveClassName: string;
  setHovered: (hovered: boolean) => void;
  setOverlayOpen: (key: string, open: boolean) => void;
};

const StorefrontHeaderUiContext = createContext<HeaderUiValue | null>(null);

const SCROLL_SOLID_PX = 24;

const solidControl =
  "text-(--foreground-heading) hover:text-primary focus-visible:ring-offset-2";
const transparentControl =
  "text-white hover:text-primary focus-visible:ring-offset-transparent";

/**
 * Editorial Header: auf der Startseite transparent (Negativ-Logo/Icons),
 * solid bei Hover, Scroll oder offenem Overlay. Andere Seiten immer solid.
 */
export function StorefrontHeaderUiProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";
  const [hovered, setHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overlays, setOverlays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      setHovered(false);
      return;
    }
    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_SOLID_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const setOverlayOpen = useCallback((key: string, open: boolean) => {
    setOverlays((prev) => {
      if (Boolean(prev[key]) === open) return prev;
      if (!open) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: true };
    });
  }, []);

  const overlayOpen = Object.keys(overlays).length > 0;
  const tone: StorefrontHeaderTone =
    isHome && !hovered && !scrolled && !overlayOpen ? "transparent" : "solid";

  const value = useMemo<HeaderUiValue>(
    () => ({
      tone,
      isHomeEditorial: isHome,
      controlClassName: tone === "transparent" ? transparentControl : solidControl,
      navInactiveClassName:
        tone === "transparent"
          ? "text-white/95 hover:text-primary"
          : "text-(--foreground-heading) hover:text-primary",
      setHovered,
      setOverlayOpen,
    }),
    [tone, isHome, setOverlayOpen],
  );

  return (
    <StorefrontHeaderUiContext.Provider value={value}>{children}</StorefrontHeaderUiContext.Provider>
  );
}

export function useStorefrontHeaderUi(): HeaderUiValue {
  const ctx = useContext(StorefrontHeaderUiContext);
  if (!ctx) {
    return {
      tone: "solid",
      isHomeEditorial: false,
      controlClassName: solidControl,
      navInactiveClassName: "text-(--foreground-heading) hover:text-primary",
      setHovered: () => {},
      setOverlayOpen: () => {},
    };
  }
  return ctx;
}

/** Meldet offene Header-Overlays (Drawer/Popover), damit der Header solid bleibt. */
export function useStorefrontHeaderOverlayLock(key: string, open: boolean): void {
  const { setOverlayOpen } = useStorefrontHeaderUi();
  useEffect(() => {
    setOverlayOpen(key, open);
    return () => setOverlayOpen(key, false);
  }, [key, open, setOverlayOpen]);
}
