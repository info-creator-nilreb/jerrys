import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { MapOverlayBlockData } from "@/lib/content/blocks/map-overlay";

function isExternalHref(href: string): boolean {
  return href.startsWith("https://");
}

export function MapOverlayCard({
  data,
  ctaHref,
  headingId,
  compact = false,
}: {
  data: Pick<MapOverlayBlockData, "headline" | "address" | "hours" | "ctaLabel">;
  ctaHref: string | null;
  headingId?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`w-full max-w-md bg-white/85 text-center shadow-[var(--shadow-overlay)] ${
        compact ? "px-5 py-6" : "px-8 py-10 md:w-[26rem] md:px-10 md:py-12"
      }`}
    >
      {data.headline ? (
        <h2
          id={headingId}
          className={
            compact
              ? "text-base font-semibold text-(--foreground-heading)"
              : "text-2xl font-semibold tracking-tight text-(--foreground-heading) md:text-3xl"
          }
        >
          {data.headline}
        </h2>
      ) : null}
      {data.address ? (
        <p
          className={`whitespace-pre-line text-(--foreground-muted) ${
            compact ? "mt-2 text-xs" : "mt-4 text-base md:text-lg"
          }`}
        >
          {data.address}
        </p>
      ) : null}
      {data.hours ? (
        <p
          className={`whitespace-pre-line text-(--foreground-muted) ${
            compact ? "mt-2 text-xs" : "mt-4 text-base"
          }`}
        >
          {data.hours}
        </p>
      ) : null}
      {data.ctaLabel && ctaHref ? (
        isExternalHref(ctaHref) ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center justify-center gap-2 font-semibold text-primary underline-offset-4 hover:text-(--primary-hover) hover:underline ${
              compact ? "mt-3 text-[11px]" : "mt-8 text-sm"
            }`}
          >
            {data.ctaLabel}
            <ArrowRight className={compact ? "size-3.5" : "size-4"} aria-hidden strokeWidth={1.75} />
          </a>
        ) : (
          <Link
            href={ctaHref}
            className={`inline-flex min-h-11 items-center justify-center gap-2 font-semibold text-primary underline-offset-4 hover:text-(--primary-hover) hover:underline ${
              compact ? "mt-3 text-[11px]" : "mt-8 text-sm"
            }`}
          >
            {data.ctaLabel}
            <ArrowRight className={compact ? "size-3.5" : "size-4"} aria-hidden strokeWidth={1.75} />
          </Link>
        )
      ) : data.ctaLabel ? (
        <p
          className={`inline-flex items-center justify-center gap-2 font-semibold text-primary ${
            compact ? "mt-4 text-[11px]" : "mt-8 text-sm"
          }`}
        >
          {data.ctaLabel}
          <ArrowRight className={compact ? "size-3.5" : "size-4"} aria-hidden strokeWidth={1.75} />
        </p>
      ) : null}
    </div>
  );
}
