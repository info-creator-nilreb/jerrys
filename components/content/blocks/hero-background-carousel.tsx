"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { HeroMotionEffect, HeroSlide } from "@/lib/content/blocks/hero";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";

type Props = {
  slides: HeroSlide[];
  slideDurationSec: number;
  motionEffect: HeroMotionEffect;
  /** Kompakte Admin-Vorschau: kürzere Übergänge, keine Priority. */
  compact?: boolean;
};

function motionClassName(
  effect: HeroMotionEffect,
  active: boolean,
  reducedMotion: boolean,
): string {
  if (!active || reducedMotion || effect === "none" || effect === "fade") {
    return "";
  }
  if (effect === "kenBurns") return "hero-motion-ken-burns";
  if (effect === "drift") return "hero-motion-drift";
  return "";
}

export function HeroBackgroundCarousel({
  slides,
  slideDurationSec,
  motionEffect,
  compact = false,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const n = slides.length;
  const canAutoplay = n > 1 && !reducedMotion;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % n);
  }, [n]);

  const slideKey = useMemo(() => slides.map((s) => s.url).join("|"), [slides]);

  useEffect(() => {
    if (!canAutoplay) return;
    const ms = Math.max(3, slideDurationSec) * 1000;
    const id = window.setInterval(goNext, ms);
    return () => window.clearInterval(id);
  }, [canAutoplay, goNext, slideDurationSec, index]);

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  if (n === 0) return null;

  const fadeMs = motionEffect === "none" || reducedMotion ? 0 : compact ? 450 : 900;
  const objectPos = compact
    ? "object-cover object-[40%_center]"
    : "object-cover object-[40%_center] md:object-[35%_32%]";
  const rootStyle = {
    ["--hero-slide-duration"]: `${Math.max(3, slideDurationSec)}s`,
  } as CSSProperties;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      role={n > 1 ? "region" : undefined}
      aria-roledescription={n > 1 ? "Karussell" : undefined}
      aria-label={n > 1 ? "Hero-Hintergrundbilder" : undefined}
      style={rootStyle}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        const alt = slide.alt ?? "";
        return (
          <div
            key={`${slide.url}-${i}`}
            className={`absolute inset-0 ${motionClassName(motionEffect, active, reducedMotion)}`}
            style={{
              opacity: active ? 1 : 0,
              transition:
                fadeMs > 0 ? `opacity ${fadeMs}ms ease-in-out` : undefined,
              zIndex: active ? 1 : 0,
              pointerEvents: active ? "auto" : "none",
            }}
            aria-hidden={!active || !alt}
          >
            <Image
              src={slide.url}
              alt={alt}
              fill
              priority={!compact && i === 0}
              quality={compact ? 75 : 90}
              className={`${objectPos} ${compact ? "opacity-90" : ""}`}
              sizes={compact ? "400px" : "100vw"}
              unoptimized={slide.url.startsWith("https://")}
            />
          </div>
        );
      })}

      {n > 1 && !compact ? (
        <nav
          className="absolute bottom-24 left-0 right-0 z-20 flex justify-center gap-2 px-4 md:bottom-28"
          aria-label="Hero-Bilder"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-current={i === index ? "true" : undefined}
              aria-label={`Bild ${i + 1} von ${n}`}
              onClick={() => setIndex(i)}
              className={`size-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
                i === index ? "bg-primary" : "bg-white/70 hover:bg-white"
              }`}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
