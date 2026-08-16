import type { Metadata } from "next";
import type { ContentPageDTO } from "@/lib/content/content-pages";
import { publicPathForContentSlug } from "@/lib/content/reserved-slugs";
import { buildStorefrontMetadata } from "@/lib/site/storefront-metadata";

/** Storefront-Metadata für eine published ContentPage. */
export function metadataForContentPage(page: ContentPageDTO): Metadata {
  const path = page.canonicalPath?.trim() || publicPathForContentSlug(page.slug);
  const title = page.seoTitle?.trim() || page.title;
  const description = page.seoDescription?.trim() || undefined;
  const og = page.ogImageUrl?.trim();

  return buildStorefrontMetadata({
    title,
    description,
    path,
    robots: page.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraphType: page.pageType === "legal" ? "article" : "website",
    images: og ? [{ url: og }] : undefined,
  });
}
