import { getPrisma } from "@/lib/db/prisma";

function isMissingHomepageTableError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const rec = e as { code?: unknown; message?: unknown };
  const code = typeof rec.code === "string" ? rec.code : "";
  const msg = typeof rec.message === "string" ? rec.message : "";
  if (code === "P2021") return true;
  return (
    msg.includes("does not exist") &&
    (msg.includes("homepage_amazon_reviews") || msg.includes("homepage_social_images"))
  );
}

export async function listActiveHomepageAmazonReviews() {
  try {
    return await getPrisma().homepageAmazonReview.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        quote: true,
        rating: true,
        headline: true,
        author: true,
        sourceUrl: true,
      },
    });
  } catch (e) {
    if (isMissingHomepageTableError(e)) return [];
    throw e;
  }
}

export async function listActiveHomepageSocialImages() {
  try {
    return await getPrisma().homepageSocialImage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        url: true,
        alt: true,
        href: true,
      },
    });
  } catch (e) {
    if (isMissingHomepageTableError(e)) return [];
    throw e;
  }
}

export async function listAllHomepageAmazonReviewsForAdmin() {
  try {
    return await getPrisma().homepageAmazonReview.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    if (isMissingHomepageTableError(e)) return [];
    throw e;
  }
}

export async function listAllHomepageSocialImagesForAdmin() {
  try {
    return await getPrisma().homepageSocialImage.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch (e) {
    if (isMissingHomepageTableError(e)) return [];
    throw e;
  }
}
