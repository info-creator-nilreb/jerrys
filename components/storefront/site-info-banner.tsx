"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/storefront/use-prefers-reduced-motion";

type Props = {
  messages: readonly string[];
  durationSec: number;
  href?: string | null;
};

export function SiteInfoBanner({ messages, durationSec, href }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const n = messages.length;

  useEffect(() => {
    if (n <= 1 || reducedMotion) return;
    const ms = Math.max(3, durationSec) * 1000;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, ms);
    return () => window.clearInterval(id);
  }, [n, durationSec, reducedMotion, index]);

  if (n === 0) return null;

  const text = messages[Math.min(index, n - 1)]!;
  const className =
    "block w-full bg-[#9a8f84] px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm";

  const inner = (
    <span
      key={text}
      className="inline-block animate-[info-banner-fade_0.45s_ease-out]"
    >
      {text}
    </span>
  );

  if (href) {
    const external = href.startsWith("https://");
    if (external) {
      return (
        <a
          href={href}
          className={`${className} transition-colors hover:bg-[#8a8076]`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={`${className} transition-colors hover:bg-[#8a8076]`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={className} role="status">
      {inner}
    </div>
  );
}
