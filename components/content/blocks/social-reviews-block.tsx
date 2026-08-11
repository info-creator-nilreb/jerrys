import { HomepageReviewsCarousel } from "@/components/storefront/homepage-reviews-carousel";
import { HomepageSocialCarousel } from "@/components/storefront/homepage-social-carousel";
import type { SocialReviewsBlockData } from "@/lib/content/blocks/social-reviews";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import {
  listActiveHomepageAmazonReviews,
  listActiveHomepageSocialImages,
} from "@/lib/homepage/marketing-queries";

export async function SocialReviewsBlock({
  data,
}: {
  data: SocialReviewsBlockData;
  blockId: string;
}) {
  let reviews: Awaited<ReturnType<typeof listActiveHomepageAmazonReviews>> = [];
  let social: Awaited<ReturnType<typeof listActiveHomepageSocialImages>> = [];
  try {
    const tuple = await Promise.all([
      data.showReviews ? listActiveHomepageAmazonReviews() : Promise.resolve([]),
      data.showSocial ? listActiveHomepageSocialImages() : Promise.resolve([]),
    ]);
    [reviews, social] = tuple;
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
    return null;
  }

  if (reviews.length === 0 && social.length === 0) return null;

  return (
    <section className="space-y-16 py-14 md:py-16">
      {data.showReviews && reviews.length > 0 ? (
        <div className="mx-auto max-w-6xl px-4">
          {data.titleReviews ? (
            <h2 className="mb-8 text-center text-2xl font-semibold text-(--foreground-heading)">
              {data.titleReviews}
            </h2>
          ) : null}
          <HomepageReviewsCarousel reviews={reviews} />
        </div>
      ) : null}
      {data.showSocial && social.length > 0 ? (
        <div className="mx-auto max-w-6xl px-4">
          {data.titleSocial ? (
            <h2 className="mb-8 text-center text-2xl font-semibold text-(--foreground-heading)">
              {data.titleSocial}
            </h2>
          ) : null}
          <HomepageSocialCarousel items={social} />
        </div>
      ) : null}
    </section>
  );
}
