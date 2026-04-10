import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";

export type StorefrontProductCard = {
  slug: string;
  title: string;
  subtitle: string | null;
  priceGrossCents: number;
  currency: string;
  images: { url: string; alt: string }[];
};

export function ProductCard({ product, linkLabel = "Details" }: { product: StorefrontProductCard; linkLabel?: string }) {
  const img = product.images[0];

  return (
    <article className="overflow-hidden rounded-xl border border-(--surface-muted) bg-white shadow-sm">
      <div className="relative aspect-square bg-(--surface-muted)">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt}
            fill
            className="object-cover"
            sizes="(min-width:768px) 50vw, 100vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-(--foreground-muted)">
            Kein Bild
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-(--foreground-heading)">{product.title}</h3>
        {product.subtitle ? (
          <p className="mt-1 text-sm text-(--foreground-muted)">{product.subtitle}</p>
        ) : null}
        <p className="mt-4 text-lg font-semibold text-primary">
          {formatPrice(product.priceGrossCents, product.currency)}*
        </p>
        <Link
          href={`/produkte/${product.slug}`}
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
    </article>
  );
}
