import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ContentBlocksRenderer } from "@/components/content/content-blocks-renderer";
import { metadataForContentPage } from "@/lib/content/content-page-metadata";
import { resolvePublicContentPage } from "@/lib/content/resolve-public-content-page";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolvePublicContentPage(slug);
  if (resolved.kind === "page") {
    return metadataForContentPage(resolved.page);
  }
  return { robots: { index: false, follow: false } };
}

/**
 * Freie CMS-Seiten (Epic 12 Slice 5).
 * Statische App-Router-Segmente (`/produkte`, `/impressum`, …) haben Vorrang.
 * Drafts → 404; `previousSlug` → 301 auf aktuellen Pfad.
 */
export default async function PublicContentPage({ params }: PageProps) {
  const { slug } = await params;
  const resolved = await resolvePublicContentPage(slug);

  if (resolved.kind === "redirect") {
    permanentRedirect(resolved.toPath);
  }
  if (resolved.kind === "not_found") {
    notFound();
  }

  const { page } = resolved;

  if (page.pageType === "legal") {
    return (
      <article
        className={`mx-auto max-w-3xl px-4 sm:px-6 ${storefrontMainPagePaddingClass}`}
      >
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading) sm:text-4xl">
            {page.title}
          </h1>
        </header>
        <ContentBlocksRenderer blocks={page.blocks} pageType="legal" />
      </article>
    );
  }

  return (
    <article
      className={`mx-auto max-w-5xl px-4 sm:px-6 ${storefrontMainPagePaddingClass}`}
    >
      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-(--foreground-heading) sm:text-4xl">
          {page.title}
        </h1>
      </header>
      <div className="space-y-10">
        <ContentBlocksRenderer blocks={page.blocks} pageType={page.pageType} />
      </div>
    </article>
  );
}
