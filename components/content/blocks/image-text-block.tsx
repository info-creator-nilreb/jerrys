import Image from "next/image";
import Link from "next/link";
import type { ImageTextBlockData } from "@/lib/content/blocks/image-text";

export function ImageTextBlock({
  data,
}: {
  data: ImageTextBlockData;
  blockId: string;
}) {
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
