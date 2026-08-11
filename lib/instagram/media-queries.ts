import { getPrisma } from "@/lib/db/prisma";
import { isMissingSchemaError } from "@/lib/db/prisma-error";
import { instagramCaptionAlt } from "@/lib/instagram/caption";
import { getInstagramConnectionPublic } from "@/lib/instagram/connection";
import {
  listActiveHomepageSocialImages,
} from "@/lib/homepage/marketing-queries";

export type SocialFeedSlide = {
  id: string;
  url: string;
  alt: string;
  href: string | null;
};

export type SocialFeedSource = "auto" | "instagram" | "curated";

export async function listActiveInstagramMediaCache(
  limit = 24,
): Promise<SocialFeedSlide[]> {
  try {
    const conn = await getInstagramConnectionPublic();
    const rows = await getPrisma().instagramMediaCache.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { postedAt: "desc" }],
      take: Math.max(1, Math.min(limit, 48)),
    });
    const username = conn.username ?? "";
    return rows.map((row) => ({
      id: row.id,
      url: row.imageUrl,
      alt: instagramCaptionAlt(row.caption, username),
      href: row.permalink,
    }));
  } catch (e) {
    if (isMissingSchemaError(e)) return [];
    throw e;
  }
}

/**
 * Storefront-Quelle für den Social-Carousel: Instagram-Cache und/oder kuratierte Bilder.
 */
export async function listSocialFeedSlides(input: {
  source: SocialFeedSource;
  limit?: number;
}): Promise<SocialFeedSlide[]> {
  const limit = input.limit ?? 12;

  if (input.source === "curated") {
    const curated = await listActiveHomepageSocialImages();
    return curated.slice(0, limit).map((row) => ({
      id: row.id,
      url: row.url,
      alt: row.alt,
      href: row.href,
    }));
  }

  const feed = await listActiveInstagramMediaCache(limit);
  if (input.source === "instagram") return feed;

  // auto
  if (feed.length > 0) return feed;
  const curated = await listActiveHomepageSocialImages();
  return curated.slice(0, limit).map((row) => ({
    id: row.id,
    url: row.url,
    alt: row.alt,
    href: row.href,
  }));
}
