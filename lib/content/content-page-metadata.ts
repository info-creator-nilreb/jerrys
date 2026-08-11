import type { Metadata } from "next";
import type { ContentPageDTO } from "@/lib/content/content-pages";
import { publicPathForContentSlug } from "@/lib/content/reserved-slugs";
import { absoluteUrl } from "@/lib/site/canonical-origin";

/** Storefront-Metadata für eine published ContentPage. */
export function metadataForContentPage(page: ContentPageDTO): Metadata {
  const path = page.canonicalPath?.trim() || publicPathForContentSlug(page.slug);
  const title = page.seoTitle?.trim() || page.title;
  const description = page.seoDescription?.trim() || undefined;
  const og = page.ogImageUrl?.trim();

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: page.robotsIndex
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      ...(og
        ? { images: [{ url: absoluteUrl(og) }] }
        : {}),
    },
  };
}
