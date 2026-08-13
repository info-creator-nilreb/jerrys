import Link from "next/link";
import { HeroBackgroundCarousel } from "@/components/content/blocks/hero-background-carousel";
import { HeroScrollHint } from "@/components/storefront/hero-scroll-hint";
import {
  resolveHeroSlides,
  type HeroBlockData,
} from "@/lib/content/blocks/hero";

export function HeroBlock({ data }: { data: HeroBlockData; blockId: string }) {
  const slides = resolveHeroSlides(data);

  return (
    <section className="relative h-dvh max-h-dvh overflow-hidden">
      <HeroBackgroundCarousel
        slides={slides}
        slideDurationSec={data.slideDurationSec}
        motionEffect={data.motionEffect}
      />
      <div
        className="absolute inset-0 z-[2] bg-linear-to-r from-black/55 via-black/20 to-transparent md:from-black/45 md:via-black/10 md:to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col px-4 pt-[calc(var(--storefront-header-height,3.75rem)+2.25rem)] pb-16 md:px-8 md:pb-20 lg:px-12">
        <div className="flex max-w-lg flex-1 flex-col justify-center">
          {data.eyebrow ? (
            <p className="text-sm font-medium tracking-wide text-primary uppercase [text-shadow:0_0_20px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.35)]">
              {data.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl [text-shadow:0_0_28px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.45)]">
            {data.headline}
          </h1>
          {data.ctaLabel && data.ctaHref ? (
            <Link
              href={data.ctaHref}
              className="mt-8 inline-flex w-fit items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
            >
              {data.ctaLabel}
            </Link>
          ) : null}
        </div>
        <HeroScrollHint />
      </div>
    </section>
  );
}
