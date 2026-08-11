import Image from "next/image";
import Link from "next/link";
import type { HeroBlockData } from "@/lib/content/blocks/hero";

export function HeroBlock({ data }: { data: HeroBlockData; blockId: string }) {
  return (
    <section className="relative h-[min(100dvh,52rem)] max-h-dvh overflow-hidden">
      <Image
        src={data.imageUrl}
        alt={data.imageAlt ?? ""}
        fill
        priority
        quality={90}
        className="object-cover object-center"
        sizes="100vw"
        unoptimized={data.imageUrl.startsWith("https://")}
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-black/55 via-black/20 to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col justify-center px-4 py-16 md:px-8 lg:px-12">
        <div className="max-w-lg">
          {data.eyebrow ? (
            <p className="text-sm font-medium tracking-wide text-primary uppercase">
              {data.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
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
      </div>
    </section>
  );
}
