import { HomepageReviewsCarousel } from "@/components/storefront/homepage-reviews-carousel";
import { HomepageSocialGrid } from "@/components/storefront/homepage-social-grid";
import {
  resolveSocialReviewsLayout,
  type SocialReviewsBlockData,
} from "@/lib/content/blocks/social-reviews";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { listActiveHomepageAmazonReviews } from "@/lib/homepage/marketing-queries";
import { listSocialFeedSlides } from "@/lib/instagram/media-queries";

export async function SocialReviewsBlock({
  data,
}: {
  data: SocialReviewsBlockData;
  blockId: string;
}) {
  const socialLayout = resolveSocialReviewsLayout(data);
  let reviews: Awaited<ReturnType<typeof listActiveHomepageAmazonReviews>> = [];
  let social: Awaited<ReturnType<typeof listSocialFeedSlides>> = [];
  try {
    const tuple = await Promise.all([
      data.showReviews ? listActiveHomepageAmazonReviews() : Promise.resolve([]),
      data.showSocial
        ? listSocialFeedSlides({
            source: data.socialSource ?? "auto",
            limit: socialLayout.socialLimit,
          })
        : Promise.resolve([]),
    ]);
    [reviews, social] = tuple;
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
    return null;
  }

  if (reviews.length === 0 && social.length === 0) return null;

  return (
    <div className="space-y-0">
      {data.showReviews && reviews.length > 0 ? (
        <section
          id="kundenstimmen"
          className="scroll-mt-20 border-y border-(--surface-muted) bg-(--surface-soft) px-4 py-16 md:py-20"
          aria-labelledby="kundenstimmen-heading"
        >
          <div className="mx-auto max-w-6xl">
            {data.titleReviews ? (
              <h2
                id="kundenstimmen-heading"
                className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl"
              >
                {data.titleReviews}
              </h2>
            ) : null}
            <HomepageReviewsCarousel reviews={reviews} />
          </div>
        </section>
      ) : null}
      {data.showSocial && social.length > 0 ? (
        <section
          id="momente-instagram"
          className="scroll-mt-20 bg-white px-4 py-16 md:py-20"
          aria-labelledby="momente-instagram-heading"
        >
          <div className="mx-auto max-w-6xl">
            {data.titleSocial ? (
              <h2
                id="momente-instagram-heading"
                className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl"
              >
                {data.titleSocial}
              </h2>
            ) : null}
            {data.introSocial ? (
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-(--foreground-muted) md:text-base">
                {data.introSocial}
              </p>
            ) : null}
            <HomepageSocialGrid
              items={social}
              desktopColumns={socialLayout.socialDesktopColumns}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
