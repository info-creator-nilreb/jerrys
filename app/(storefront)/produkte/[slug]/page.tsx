import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/catalog/format";
import { getActiveProductBySlug } from "@/lib/catalog/queries";
import { pdpStockDeliveryLine } from "@/lib/catalog/pdp-stock-delivery";
import { resolvePdpLeadText, resolvePdpSpecs } from "@/lib/catalog/pdp-resolve-display";
import { defaultAddQuantity } from "@/lib/cart/quantity";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductDetailGallery } from "@/components/storefront/product-detail-gallery";
import { ProductExpressCheckout } from "@/components/storefront/product-express-checkout";
import { ProductJsonLd } from "@/components/storefront/product-json-ld";
import { ProductPdpSpecsPanel } from "@/components/storefront/product-pdp-specs-panel";
import { ProductPdpTrustFooterBar, ProductPdpUspRow } from "@/components/storefront/product-pdp-trust-blocks";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { absoluteUrl } from "@/lib/site/canonical-origin";

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
  const desc =
    resolvePdpLeadText(product) || product.subtitle || textPreviewFromHtml(product.description);
  const cover = product.images[0];
  const ogImage = cover ? [{ url: absoluteUrl(cover.url), alt: cover.alt }] : undefined;
  return {
    title: product.title,
    description: desc,
    alternates: { canonical: `/produkte/${product.slug}` },
    openGraph: {
      title: product.title,
      description: desc,
      type: "website",
      url: absoluteUrl(`/produkte/${product.slug}`),
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: desc,
      images: cover ? [absoluteUrl(cover.url)] : undefined,
    },
  };
}

export default async function ProduktDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, shopShip] = await Promise.all([
    getActiveProductBySlug(slug),
    getShopShippingSettings(),
  ]);
  if (!product) notFound();

  const specs = resolvePdpSpecs(product);
  const leadDisplay = resolvePdpLeadText(product);

  const qtyRules = {
    availableQuantity: product.availableQuantity,
    minOrderQty: product.minOrderQty,
    purchaseStep: product.purchaseStep,
    maxOrderQty: product.maxOrderQty,
  };
  const canAddToCart = defaultAddQuantity(qtyRules) !== null;

  const titleCrumb =
    product.title.length > 52 ? `${product.title.slice(0, 51).trimEnd()}…` : product.title;

  const jsonLdDescription =
    leadDisplay || product.subtitle || textPreviewFromHtml(product.description);

  const hasStrikePrice =
    product.listPriceGrossCents != null && product.listPriceGrossCents > product.priceGrossCents;

  const hasSpecsPanel =
    Boolean(specs.dimensionsText?.trim()) ||
    Boolean(specs.weightText?.trim()) ||
    Boolean(specs.materialText?.trim()) ||
    specs.featureBullets.length > 0;

  const stockLine = pdpStockDeliveryLine({
    availableQuantity: product.availableQuantity,
    deliveryTimeKey: product.deliveryTimeKey,
  });
  const inStock = product.availableQuantity > 0;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-20 md:pb-16 md:pt-24">
        <ProductJsonLd
          name={product.title}
          description={jsonLdDescription}
          slug={product.slug}
          priceGrossCents={product.priceGrossCents}
          currency={product.currency}
          availableQuantity={product.availableQuantity}
          images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
          aggregateRatingAverage={product.amazonRatingAverage}
          aggregateRatingCount={product.amazonRatingCount}
        />
        <StorefrontBreadcrumbs
          items={[
            { href: "/", label: "Start" },
            { href: "/produkte", label: "Produkte" },
            { label: titleCrumb },
          ]}
        />

        <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
          <div className="min-w-0 lg:row-span-1">
            {product.images.length === 0 ? (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-(--surface-muted) bg-(--surface-soft) text-(--foreground-muted)">
                Kein Bild
              </div>
            ) : (
              <ProductDetailGallery
                images={product.images}
                isBestseller={product.isBestseller}
                productTitle={product.title}
              />
            )}
          </div>

          <div className="min-w-0 lg:row-span-1">
            <article className="rounded-xl border border-(--surface-muted) bg-white p-6 shadow-md md:p-7 lg:p-8">
              {product.categoryTag?.trim() ? (
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">
                  {product.categoryTag.trim()}
                </p>
              ) : null}
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-(--foreground-heading) md:text-[1.65rem] lg:text-3xl">
                {product.title}
              </h1>
              {product.subtitle ? (
                <p className="mt-2 text-base italic leading-snug text-(--foreground-muted) md:text-lg">
                  {product.subtitle}
                </p>
              ) : null}

              {product.amazonRatingAverage != null && product.amazonRatingCount != null ? (
                <AmazonRatingDisplay
                  average={product.amazonRatingAverage}
                  count={product.amazonRatingCount}
                  reviewUrl={product.amazonReviewUrl}
                  linkTreatment="default"
                />
              ) : null}

              {leadDisplay ? (
                <p className="mt-4 text-sm leading-relaxed text-(--foreground-muted) md:text-[0.9375rem]">
                  {leadDisplay}
                </p>
              ) : null}

              {hasSpecsPanel ? (
                <ProductPdpSpecsPanel
                  dimensionsText={specs.dimensionsText}
                  weightText={specs.weightText}
                  materialText={specs.materialText}
                  featureBullets={specs.featureBullets}
                />
              ) : null}

              <ProductPdpUspRow />

              <div className="mt-6 space-y-5 border-t border-(--surface-muted) pt-6">
                <div>
                  {hasStrikePrice ? (
                    <p className="text-sm text-(--foreground-muted)">
                      <span className="mr-2 line-through">
                        {formatPrice(product.listPriceGrossCents!, product.currency)}
                      </span>
                      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-(--foreground-muted)">
                        UVP
                      </span>
                    </p>
                  ) : null}
                  <p className="text-2xl font-semibold tracking-tight text-primary md:text-[1.7rem]">
                    {formatPrice(product.priceGrossCents, product.currency)}
                    <span className="text-base font-normal text-(--foreground-muted)">*</span>
                  </p>
                  <p className="mt-1 text-sm text-(--foreground-muted)">inkl. MwSt., zzgl. Versand</p>
                </div>

                <ul className="space-y-2.5 text-sm text-(--foreground-muted)">
                  <li className="flex gap-2.5">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${inStock ? "bg-primary" : "bg-(--foreground-muted)"}`}
                      aria-hidden
                    />
                    <span className="leading-snug">{stockLine}</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden
                      strokeWidth={1.5}
                    />
                    <span className="leading-snug">30 Tage Rückgaberecht</span>
                  </li>
                </ul>

                <AddToCartForm
                  productId={product.id}
                  canAdd={canAddToCart}
                  quantityRules={qtyRules}
                  showCartIcon
                  layout="pdp"
                />

                {canAddToCart ? <ProductExpressCheckout enabled /> : <ProductExpressCheckout enabled={false} />}

                <p className="text-center text-[0.7rem] leading-snug text-(--foreground-muted)">
                  Im Checkout:{" "}
                  <span className="text-(--foreground-heading)">Vorkasse, PayPal, Klarna</span> (Demo).
                </p>

                <p className="border-t border-(--surface-muted) pt-4 text-[0.68rem] leading-relaxed text-(--foreground-muted)">
                  * inkl. MwSt., zzgl. Versand. Nach dem Warenkorb folgen Warenkorb und Checkout.
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <ProductPdpTrustFooterBar
        freeShippingFromSubtotalGrossCents={shopShip.freeShippingFromSubtotalGrossCents}
      />
    </>
  );
}
