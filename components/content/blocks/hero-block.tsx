import Image from "next/image";
import Link from "next/link";
import { HeroScrollHint } from "@/components/storefront/hero-scroll-hint";
import type { HeroBlockData } from "@/lib/content/blocks/hero";

export function HeroBlock({ data }: { data: HeroBlockData; blockId: string }) {
  return (
    <section className="relative h-dvh max-h-dvh overflow-hidden">
      <Image
        src={data.imageUrl}
        alt={data.imageAlt ?? ""}
        fill
        priority
        quality={90}
        className="object-cover object-[40%_center] md:object-[35%_32%]"
        sizes="100vw"
        unoptimized={data.imageUrl.startsWith("https://")}
        aria-hidden={!data.imageAlt}
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-black/55 via-black/20 to-transparent md:from-black/45 md:via-black/10 md:to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col px-4 pt-24 pb-16 md:px-8 md:pt-28 md:pb-20 lg:px-12">
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
              className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-(--primary-hover)"
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
