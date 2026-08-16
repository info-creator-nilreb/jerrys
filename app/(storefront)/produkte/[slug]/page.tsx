import { notFound, permanentRedirect } from "next/navigation";
import {
  pickPrimaryCategoryRef,
  uniqueCategoriesBySlug,
} from "@/lib/catalog/category-membership";
import {
  getActiveProductByPreviousSlug,
  getActiveProductBySlug,
} from "@/lib/catalog/queries";
import { resolvePdpDisplay } from "@/lib/catalog/pdp-resolve-display";
import { isProductDescriptionRedundantWithLead } from "@/lib/catalog/pdp-description-overlap";
import { pickDefaultVariant } from "@/lib/catalog/default-variant-storefront";
import {
  resolveProductBreadcrumbItems,
  truncateBreadcrumbLabel,
} from "@/lib/catalog/product-storefront-breadcrumbs";
import {
  metadataForProduct,
  productOfferJsonLdInputFromProduct,
  type StorefrontProductMetadataSource,
} from "@/lib/catalog/storefront-product-metadata";
import { buildStorefrontMetadata } from "@/lib/site/storefront-metadata";
import { readBrowseContextFromCookies } from "@/lib/storefront/browse-context";
import { AmazonRatingDisplay } from "@/components/storefront/amazon-rating-display";
import { ProductDetailGallery } from "@/components/storefront/product-detail-gallery";
import { ProductJsonLd } from "@/components/storefront/product-json-ld";
import { ProductPdpDescription } from "@/components/storefront/product-pdp-description";
import { ProductPdpPurchasePanel } from "@/components/storefront/product-pdp-purchase-panel";
import { ProductPdpSpecsPanel } from "@/components/storefront/product-pdp-specs-panel";
import { ProductPdpTrustFooterBar, ProductPdpUspRow } from "@/components/storefront/product-pdp-trust-blocks";
import { WorkshopSessionList } from "@/components/storefront/workshop-session-list";
import { StorefrontBreadcrumbs } from "@/components/storefront/storefront-breadcrumbs";
import { getShopShippingSettings } from "@/lib/shop/shipping-settings";
import { isPayPalConfigured } from "@/lib/payments/paypal-config";

export const dynamic = "force-dynamic";

function displayFromProduct(
  product: NonNullable<Awaited<ReturnType<typeof getActiveProductBySlug>>>,
) {
  const linkedCategories = uniqueCategoriesBySlug(
    product.collectionMemberships.flatMap((m) =>
      m.collection.categoryLinks.map((l) => l.category),
    ),
  );
  return resolvePdpDisplay({
    slug: product.slug,
    title: product.title,
    leadText: product.leadText,
    dimensionsText: product.dimensionsText,
    weightText: product.weightText,
    materialText: product.materialText,
    featureBullets: product.featureBullets,
    attributes: product.attributes,
    categoryTitles: linkedCategories.map((c) => c.title),
    categorySlugs: linkedCategories.map((c) => c.slug),
  });
}

function metadataSourceFromProduct(
  product: NonNullable<Awaited<ReturnType<typeof getActiveProductBySlug>>>,
  defaultVariant: NonNullable<ReturnType<typeof pickDefaultVariant>>,
): StorefrontProductMetadataSource {
  return {
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    leadText: displayFromProduct(product).leadText,
    currency: product.currency,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    defaultVariant: {
      sku: defaultVariant.sku,
      priceGrossCents: defaultVariant.priceGrossCents,
      availableQuantity: defaultVariant.availableQuantity,
    },
    amazonRatingAverage: product.amazonRatingAverage,
    amazonRatingCount: product.amazonRatingCount,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) {
    const relocated = await getActiveProductByPreviousSlug(slug);
    if (relocated) {
      return buildStorefrontMetadata({
        title: "Produkt",
        path: `/produkte/${relocated.slug}`,
      });
    }
    return { title: "Produkt" };
  }
  const defaultVariant = pickDefaultVariant(product);
  if (!defaultVariant) return { title: product.title };
  return metadataForProduct(metadataSourceFromProduct(product, defaultVariant));
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

  if (!product) {
    const relocated = await getActiveProductByPreviousSlug(slug);
    if (relocated) {
      permanentRedirect(`/produkte/${relocated.slug}`);
    }
    notFound();
  }

  const defaultVariant = pickDefaultVariant(product);
  if (!defaultVariant || product.variants.length === 0) notFound();

  const metadataSource = metadataSourceFromProduct(product, defaultVariant);
  const display = displayFromProduct(product);
  const leadDisplay = display.leadText;

  const titleCrumb = truncateBreadcrumbLabel(product.title);

  const linkedCategories = uniqueCategoriesBySlug(
    product.collectionMemberships.flatMap((m) =>
      m.collection.categoryLinks.map((l) => l.category),
    ),
  );
  const primaryCategory = pickPrimaryCategoryRef(linkedCategories);
  const categoryBySlug = new Map(linkedCategories.map((c) => [c.slug, c] as const));
  const collectionTitleBySlug = new Map(
    product.collectionMemberships.map((m) => [m.collection.slug, m.collection.title] as const),
  );
  const browseContext = await readBrowseContextFromCookies();
  const categorySlugs = new Set(categoryBySlug.keys());
  const collectionSlugs = new Set(collectionTitleBySlug.keys());

  const hasSpecsPanel = display.leftSpecs.length > 0 || display.propertySpecs.length > 0;
  const showFullDescription =
    Boolean(product.description?.trim()) &&
    !isProductDescriptionRedundantWithLead(product.description, leadDisplay);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-20 md:pb-16 md:pt-24">
        <ProductJsonLd {...productOfferJsonLdInputFromProduct(metadataSource)} />
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

              {showFullDescription ? (
                <ProductPdpDescription html={product.description} />
              ) : null}

              {product.showWorkshopCalendar ? (
                <div className="mt-6 border-t border-(--surface-muted) pt-6">
                  <WorkshopSessionList
                    density="embed"
                    showHeader
                    title="Kommende Termine"
                    intro="Termin wählen — Details und Buchung auf der Terminseite."
                    headingId={`pdp-workshop-sessions-${product.slug}`}
                    limit={6}
                  />
                </div>
              ) : null}

              <ProductPdpPurchasePanel
                productId={product.id}
                currency={product.currency}
                listPriceGrossCents={defaultVariant.listPriceGrossCents}
                deliveryTimeKeyFallback={defaultVariant.deliveryTimeKey}
                payPalConfigured={isPayPalConfigured()}
                paypalClientId={process.env.PAYPAL_CLIENT_ID?.trim() ?? ""}
                variants={product.variants}
              />
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
