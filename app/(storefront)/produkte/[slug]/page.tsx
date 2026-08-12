import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/lib/catalog/queries";
import { resolvePdpDisplay } from "@/lib/catalog/pdp-resolve-display";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";
import {
  resolveProductBreadcrumbItems,
  truncateBreadcrumbLabel,
} from "@/lib/catalog/product-storefront-breadcrumbs";
import { readBrowseContextFromCookies } from "@/lib/storefront/browse-context";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductDetailGallery } from "@/components/storefront/product-detail-gallery";
import { ProductJsonLd } from "@/components/storefront/product-json-ld";
import { ProductPdpPurchasePanel } from "@/components/storefront/product-pdp-purchase-panel";
import { ProductPdpSpecsPanel } from "@/components/storefront/product-pdp-specs-panel";
import { ProductPdpTrustFooterBar, ProductPdpUspRow } from "@/components/storefront/product-pdp-trust-blocks";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
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

function displayFromProduct(
  product: NonNullable<Awaited<ReturnType<typeof getActiveProductBySlug>>>,
) {
  return resolvePdpDisplay({
    slug: product.slug,
    title: product.title,
    leadText: product.leadText,
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
    featureBullets: product.featureBullets,
    attributes: product.attributes,
    categoryTitles: product.categoryMemberships.map((m) => m.category.title),
    categorySlugs: product.categoryMemberships.map((m) => m.category.slug),
  });
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
  const display = displayFromProduct(product);
  const desc =
    display.leadText || product.subtitle || textPreviewFromHtml(product.description);
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

  const defaultVariant = pickDefaultVariant(product);
  if (!defaultVariant || product.variants.length === 0) notFound();

  const display = displayFromProduct(product);
  const leadDisplay = display.leadText;

  const titleCrumb = truncateBreadcrumbLabel(product.title);

  const primaryRow = product.categoryMemberships.find((m) => m.isPrimary);
  const primaryCategory = primaryRow?.category ?? null;
  const categoryBySlug = new Map(
    product.categoryMemberships.map((m) => [m.category.slug, m.category] as const),
  );
  const collectionTitleBySlug = new Map(
    product.collectionMemberships.map((m) => [m.collection.slug, m.collection.title] as const),
  );
  const browseContext = await readBrowseContextFromCookies();
  const categorySlugs = new Set(categoryBySlug.keys());
  const collectionSlugs = new Set(collectionTitleBySlug.keys());

  const jsonLdDescription =
    leadDisplay || product.subtitle || textPreviewFromHtml(product.description);

  const hasSpecsPanel = display.leftSpecs.length > 0 || display.propertyLines.length > 0;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-20 md:pb-16 md:pt-24">
        <ProductJsonLd
          name={product.title}
          description={jsonLdDescription}
          slug={product.slug}
          priceGrossCents={defaultVariant.priceGrossCents}
          currency={product.currency}
          availableQuantity={defaultVariant.availableQuantity}
          images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
          aggregateRatingAverage={product.amazonRatingAverage}
          aggregateRatingCount={product.amazonRatingCount}
        />
        <StorefrontBreadcrumbs
          items={resolveProductBreadcrumbItems({
            titleCrumb,
            browseContext,
            primaryCategory,
            categorySlugs,
            collectionSlugs,
            categoryBySlug,
            collectionTitleBySlug,
          })}
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
                <div className="mt-4">
                  <AmazonRatingDisplay
                    average={product.amazonRatingAverage}
                    count={product.amazonRatingCount}
                    reviewUrl={product.amazonReviewUrl}
                  />
                </div>
              ) : null}

              {leadDisplay ? (
                <p className="mt-4 text-sm leading-relaxed text-(--foreground-muted) md:text-[0.9375rem]">
                  {leadDisplay}
                </p>
              ) : null}

              {hasSpecsPanel ? <ProductPdpSpecsPanel display={display} /> : null}

              <ProductPdpUspRow usps={display.usps} />

              <ProductPdpPurchasePanel
                productId={product.id}
                currency={product.currency}
                listPriceGrossCents={defaultVariant.listPriceGrossCents}
                deliveryTimeKeyFallback={defaultVariant.deliveryTimeKey}
                variants={product.variants}
              />
            </article>
          </div>
        </div>
      </div>

      {product.showWorkshopCalendar ? (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
          <WorkshopSessionList
            density="embed"
            showHeader
            title="Kommende Termine"
            limit={6}
          />
        </div>
      ) : null}

      <ProductPdpTrustFooterBar
        freeShippingFromSubtotalGrossCents={shopShip.freeShippingFromSubtotalGrossCents}
      />
    </>
  );
}
