import Image from "next/image";
import Link from "next/link";
import type { ImageTextBlockData } from "@/lib/content/blocks/image-text";

export function ImageTextBlock({
  data,
}: {
  data: ImageTextBlockData;
  blockId: string;
}) {
  if (data.layout === "stacked") {
    return (
      <section
        aria-labelledby={`image-text-${data.title}`}
        className="border-y border-(--surface-muted) bg-white px-4 py-12 md:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id={`image-text-${data.title}`}
            className="text-center text-xl font-semibold text-(--foreground-heading) md:text-2xl"
          >
            {data.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-(--foreground-muted) md:text-lg">
            {data.body}
          </p>
          <div className="mt-8 overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-soft) shadow-sm">
            <Image
              src={data.imageUrl}
              alt={data.imageAlt ?? ""}
              width={1024}
              height={542}
              className="h-auto w-full"
              sizes="(max-width: 1024px) 100vw, 896px"
              unoptimized={
                data.imageUrl.startsWith("https://") || data.imageUrl.endsWith(".png")
              }
            />
          </div>
          {data.ctaLabel && data.ctaHref ? (
            <p className="mt-6 text-center">
              <Link
                href={data.ctaHref}
                className="text-sm font-semibold text-primary hover:text-(--primary-hover) hover:underline"
              >
                {data.ctaLabel}
              </Link>
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  const imageFirst = data.imagePosition === "left";
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <div
        className={`grid items-center gap-10 md:grid-cols-2 ${imageFirst ? "" : "md:[&>*:first-child]:order-2"}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-(--surface-soft)">
          <Image
            src={data.imageUrl}
            alt={data.imageAlt ?? ""}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 50vw"
            unoptimized={data.imageUrl.startsWith("https://")}
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
            {data.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-(--foreground-muted) md:text-lg">
            {data.body}
          </p>
          {data.ctaLabel && data.ctaHref ? (
            <Link
              href={data.ctaHref}
              className="mt-6 inline-flex text-sm font-semibold text-primary hover:text-(--primary-hover) hover:underline"
            >
              {data.ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
