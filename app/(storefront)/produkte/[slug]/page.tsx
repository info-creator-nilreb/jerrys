import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/catalog/format";
import { getActiveProductBySlug } from "@/lib/catalog/queries";
import { sanitizeProductDescriptionHtml } from "@/lib/catalog/sanitize-html";
import { defaultAddQuantity } from "@/lib/cart/quantity";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";

export const dynamic = "force-dynamic";

function textPreviewFromHtml(html: string | null | undefined, max = 160): string | undefined {
  if (!html?.trim()) return undefined;
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return undefined;
  return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) {
    return { title: "Produkt" };
  }
  return {
    title: product.title,
    description: product.subtitle ?? textPreviewFromHtml(product.description),
  };
}

export default async function ProduktDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const safeDescription = sanitizeProductDescriptionHtml(product.description);

  const qtyRules = {
    stockQuantity: product.stockQuantity,
    minOrderQty: product.minOrderQty,
    purchaseStep: product.purchaseStep,
    maxOrderQty: product.maxOrderQty,
  };
  const canAddToCart = defaultAddQuantity(qtyRules) !== null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 md:py-28">
      <p className="text-sm text-(--foreground-muted)">
        <Link href="/produkte" className="text-primary underline-offset-4 hover:underline">
          ← Alle Produkte
        </Link>
      </p>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-12">
        <div className="space-y-4">
          {product.images.length === 0 ? (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-(--surface-muted) bg-(--surface-soft) text-(--foreground-muted)">
              Kein Bild
            </div>
          ) : (
            product.images.map((img, index) => (
              <div
                key={img.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-muted)"
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width:768px) 50vw, 100vw"
                  priority={index === 0}
                />
              </div>
            ))
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
            {product.title}
          </h1>
          {product.subtitle ? (
            <p className="mt-2 text-lg text-(--foreground-muted)">{product.subtitle}</p>
          ) : null}
          <p className="mt-6 text-2xl font-semibold text-primary">
            {formatPrice(product.priceGrossCents, product.currency)}*
          </p>
          <AddToCartForm productId={product.id} canAdd={canAddToCart} />
          {safeDescription ? (
            <div
              className="mt-8 max-w-none text-(--foreground-muted) [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-(--surface-muted) [&_blockquote]:pl-4 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-(--surface-muted) [&_td]:p-2 [&_th]:border [&_th]:border-(--surface-muted) [&_th]:p-2 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          ) : null}
          <p className="mt-10 text-sm text-(--foreground-muted)">
            * inkl. MwSt., zzgl. Versand – Checkout folgt im nächsten Schritt.
          </p>
        </div>
      </div>
    </div>
  );
}
