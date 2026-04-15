import Image from "next/image";
import { DatabaseUnavailableNotice } from "@/components/storefront/database-unavailable-notice";
import { HeroScrollHint } from "@/components/storefront/hero-scroll-hint";
import { HomepageReviewsCarousel } from "@/components/storefront/homepage-reviews-carousel";
import { HomepageSocialCarousel } from "@/components/storefront/homepage-social-carousel";
import { ProductCard } from "@/components/storefront/product-card";
import { UspIcon } from "@/components/storefront/usp-icons";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import {
  listActiveHomepageAmazonReviews,
  listActiveHomepageSocialImages,
} from "@/lib/homepage/marketing-queries";

const usps = [
  {
    icon: "design" as const,
    title: "Ausgezeichnetes Design",
    body: "Funktionalität und zeitloses Design – ausgezeichnet u. a. mit dem Plus X Award.",
  },
  {
    icon: "germany" as const,
    title: "Made in Germany",
    body: "Hochwertige, robuste Materialien und Fertigung in Deutschland für eure Stubentiger.",
  },
  {
    icon: "heart" as const,
    title: "Ein Herz für Tiere",
    body: "Für jedes verkaufte Produkt spenden wir 1 Euro an den Tierschutz.",
  },
];

export const dynamic = "force-dynamic";

export default async function StorefrontHomePage() {
  let products: Awaited<ReturnType<typeof listActiveProductsForStorefront>> = [];
  let homepageReviews: Awaited<ReturnType<typeof listActiveHomepageAmazonReviews>> = [];
  let homepageSocial: Awaited<ReturnType<typeof listActiveHomepageSocialImages>> = [];
  let dbUnavailable = false;
  try {
    const tuple = await Promise.all([
      listActiveProductsForStorefront(),
      listActiveHomepageAmazonReviews(),
      listActiveHomepageSocialImages(),
    ]);
    [products, homepageReviews, homepageSocial] = tuple;
  } catch (e) {
    if (isDatabaseUnreachable(e)) {
      dbUnavailable = true;
    } else {
      throw e;
    }
  }
  return (
    <div>
      {/* Eine Viewporthöhe; Text links (freier Bildbereich), kein Karten-Overlay über dem Produkt */}
      <section className="relative h-dvh max-h-dvh overflow-hidden">
        <Image
          src="/media/hero-mood.jpg"
          alt=""
          fill
          priority
          quality={90}
          className="object-cover object-[40%_center] md:object-[35%_32%]"
          sizes="100vw"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-linear-to-r from-black/55 via-black/20 to-transparent md:from-black/45 md:via-black/10 md:to-transparent"
          aria-hidden
        />
        <div className="relative z-10 flex h-full flex-col px-4 pt-24 pb-16 md:px-8 md:pt-28 md:pb-20 lg:px-12">
          <div className="flex max-w-lg flex-1 flex-col justify-center">
            <p className="text-sm font-medium tracking-wide text-primary uppercase [text-shadow:0_0_20px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.35)]">
              Lieben Katz und Mensch
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl [text-shadow:0_0_28px_rgba(0,0,0,0.5),0_2px_12px_rgba(0,0,0,0.45)]">
              Katzenhöhle mit Stil
            </h1>
          </div>
          <HeroScrollHint />
        </div>
      </section>

      <section id="nach-hero" className="mx-auto max-w-6xl px-4 py-16 md:py-20 scroll-mt-[5.5rem]">
        <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
          Funktion trifft Design
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-base text-(--foreground-muted) md:text-lg">
          Katzenmöbel, die sich nahtlos in deine vier Wände einfügen – von jerry&apos;s, made in
          Germany.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {usps.map((u) => (
            <article
              key={u.title}
              className="rounded-lg border border-(--surface-muted) bg-white p-6 text-center shadow-sm"
            >
              <div className="flex flex-col items-center">
                <UspIcon variant={u.icon} />
                <h3 className="mt-4 text-lg font-semibold text-(--foreground-heading)">
                  {u.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-(--foreground-muted)">{u.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="made-in-germany-heading" className="border-y border-(--surface-muted) bg-white px-4 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 id="made-in-germany-heading" className="text-center text-xl font-semibold text-(--foreground-heading) md:text-2xl">
            Made in Germany
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-(--foreground-muted) md:text-lg">
            Designed und gefertigt in Deutschland – mit Liebe zum Detail und zuverlässiger Qualität für eure
            Stubentiger.
          </p>
          <div className="mt-8 overflow-hidden rounded-xl border border-(--surface-muted) bg-(--surface-soft) shadow-sm">
            <Image
              src="/media/made-in-germany-banner.png"
              alt="Grafik: bunte Katzen-Silhouetten, in der Mitte der Schriftzug Made in Germany"
              width={1024}
              height={542}
              className="h-auto w-full"
              sizes="(max-width: 1024px) 100vw, 896px"
              unoptimized
            />
          </div>
        </div>
      </section>

      {homepageReviews.length > 0 ? (
        <section
          id="kundenstimmen"
          className="scroll-mt-20 border-y border-(--surface-muted) bg-(--surface-soft) px-4 py-16 md:py-20"
          aria-labelledby="kundenstimmen-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="kundenstimmen-heading"
              className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl"
            >
              Das sagen Kund:innen
            </h2>
            <HomepageReviewsCarousel reviews={homepageReviews} />
          </div>
        </section>
      ) : null}

      <section id="produkte" className="scroll-mt-20 bg-(--surface-soft) px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
            Produkte
          </h2>
          {dbUnavailable ? (
            <DatabaseUnavailableNotice />
          ) : products.length === 0 ? (
            <p className="mt-10 text-center text-base text-(--foreground-muted) md:text-lg">
              Demnächst findet ihr hier unsere Katzenmöbel. Schaut bald wieder vorbei.
            </p>
          ) : (
            <div className="mt-10 grid w-full items-stretch justify-items-center gap-10 md:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className="flex h-full min-h-0 w-full max-w-lg flex-1 flex-col self-stretch">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {homepageSocial.length > 0 ? (
        <section
          id="momente-instagram"
          className="scroll-mt-20 bg-white px-4 py-16 md:py-20"
          aria-labelledby="momente-instagram-heading"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="momente-instagram-heading"
              className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl"
            >
              Momente von Instagram
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-(--foreground-muted) md:text-base">
              Einblicke in Stubentiger und jerry&apos;s – folgt uns gerne auf Instagram.
            </p>
            <HomepageSocialCarousel items={homepageSocial} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
