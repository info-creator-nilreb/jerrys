"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  isInternalStorefrontNavigationHref,
  storefrontNavigationTarget,
} from "@/lib/storefront/navigation-progress";

const SHOW_DELAY_MS = 120;

export function StorefrontNavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLocation = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;

  const [trackedLocation, setTrackedLocation] = useState(currentLocation);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  if (currentLocation !== trackedLocation) {
    setTrackedLocation(currentLocation);
    setPendingTarget(null);
    setShowProgress(false);
  }

  useEffect(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, [currentLocation]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        !isInternalStorefrontNavigationHref(href, window.location.origin, {
          target: anchor.target,
          download: anchor.hasAttribute("download"),
        })
      ) {
        return;
      }

      const nextLocation = storefrontNavigationTarget(href, window.location.origin);
      if (!nextLocation || nextLocation === currentLocation) return;

      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => {
        const now = `${window.location.pathname}${window.location.search}`;
        if (now === nextLocation) return;
        setPendingTarget(nextLocation);
        setShowProgress(true);
      }, SHOW_DELAY_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [currentLocation]);

  const visible =
    showProgress && pendingTarget !== null && pendingTarget !== currentLocation;

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Seite wird geladen"
      aria-busy="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 overflow-hidden bg-(--surface-muted)/40"
    >
      <div className="storefront-nav-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
