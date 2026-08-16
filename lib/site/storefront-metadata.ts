import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site/canonical-origin";

export type StorefrontSocialImage = {
  url: string;
  alt?: string;
};

export type StorefrontMetadataInput = {
  title: string;
  description?: string | null;
  /** Relativer Pfad oder absolute URL; wird canonical + OG-URL. */
  path: string;
  robots?: Metadata["robots"];
  openGraphType?: "website" | "product" | "article";
  images?: StorefrontSocialImage[];
};

function normalizeImages(
  images: StorefrontSocialImage[] | undefined,
): Array<{ url: string; alt?: string }> | undefined {
  if (!images?.length) return undefined;
  return images.map((img) => ({
    url: absoluteUrl(img.url),
    alt: img.alt,
  }));
}

/**
 * Zentrale Storefront-Metadata (title, description, canonical, robots, OG, Twitter).
 * Seiten liefern nur fachliche Eingaben — keine doppelten Metadata-Blöcke.
 */
export function buildStorefrontMetadata(input: StorefrontMetadataInput): Metadata {
  const title = input.title.trim();
  const description = input.description?.trim() || undefined;
  const canonicalPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const ogImages = normalizeImages(input.images);
  const ogType = input.openGraphType ?? "website";

  const openGraph: Metadata["openGraph"] = {
    title,
    description,
    type: ogType === "product" ? "website" : ogType,
    url: absoluteUrl(canonicalPath),
    ...(ogImages ? { images: ogImages } : {}),
  };

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    ...(input.robots != null ? { robots: input.robots } : {}),
    openGraph,
    twitter: {
      card: ogImages?.length ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImages?.length ? { images: ogImages.map((i) => i.url) } : {}),
    },
    ...(ogType === "product"
      ? {
          other: {
            "og:type": "product",
          },
        }
      : {}),
  };
}

/** Facettierte Listing-URLs (Suche/Filter/Sort) nicht indexieren — kanonisch bleibt die Basisliste. */
export const CATALOG_LISTING_NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: true,
};

export function catalogListingHasNonIndexParams(sp: {
  q?: string;
  sort?: string;
  verfuegbar?: string;
  preis_min?: string;
  preis_max?: string;
  kategorie?: string;
}): boolean {
  if (sp.q?.trim()) return true;
  if (sp.sort?.trim() && sp.sort.trim() !== "default") return true;
  if (sp.verfuegbar === "1") return true;
  if (sp.preis_min?.trim()) return true;
  if (sp.preis_max?.trim()) return true;
  if (sp.kategorie?.trim()) return true;
  return false;
}

export function htmlToPlainTextPreview(
  html: string | null | undefined,
  max = 160,
): string | undefined {
  if (!html?.trim()) return undefined;
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return undefined;
  return plain.length <= max ? plain : `${plain.slice(0, max - 1)}…`;
}
