"use client";

import { ChevronDown } from "lucide-react";

export function HeroScrollHint() {
  return (
    <a
      href="#nach-hero"
      className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-(--foreground-heading) opacity-90 transition-opacity hover:text-primary hover:opacity-100"
      aria-label="Weiter nach unten scrollen"
    >
      <span className="hero-scroll-nudge rounded-full border border-(--foreground-heading)/25 bg-white/70 p-2 shadow-sm backdrop-blur-sm">
        <ChevronDown className="size-6" aria-hidden strokeWidth={2} />
      </span>
    </a>
  );
}
