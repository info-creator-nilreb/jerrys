import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentBlocksRenderer } from "@/components/content/content-blocks-renderer";
import { getContentPageById } from "@/lib/content/content-pages";
import { HOME_PAGE_STABLE_ID } from "@/lib/content/migrate-storefront-content";
import { verifyContentPreviewToken } from "@/lib/content/preview-token";
import { CONTENT_PAGE_HOME_SLUG } from "@/lib/content/reserved-slugs";
import { storefrontMainPagePaddingClass } from "@/lib/storefront/page-below-header-padding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inhaltsvorschau",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ token?: string }>;
};

function isHomepagePreview(page: {
  id: string;
  slug: string;
  pageType: string;
}): boolean {
  return (
    page.pageType === "homepage" ||
    page.id === HOME_PAGE_STABLE_ID ||
    page.slug === CONTENT_PAGE_HOME_SLUG
  );
}

function PreviewNotice({
  status,
  variant = "banner",
}: {
  status: "draft" | "published";
  /** `banner` = volle Breite (Startseite); `card` = in max-w-Artikeln */
  variant?: "banner" | "card";
}) {
  const body = (
    <>
      <p className="font-semibold">Vorschau — nicht öffentlich</p>
      <p className="mt-1 text-amber-900/90">
        Status: {status === "published" ? "Veröffentlicht" : "Entwurf"}. Diese URL ist
        signiert, zeitlich begrenzt und nicht für Suchmaschinen bestimmt.
      </p>
    </>
  );

  if (variant === "card") {
    return (
      <div
        className="mb-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className="w-full border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6"
      role="status"
    >
      <div className="mx-auto max-w-5xl">{body}</div>
    </div>
  );
}

/**
 * Signierte, kurzlebige CMS-Vorschau (Draft oder Published).
 * Startseite: full-bleed wie `/` (kein max-w-Wrapper um Hero/Blöcke).
 * Ohne gültiges Token → 404 (kein Auth-Leak / keine Indexierung).
 */
export default async function ContentPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { pageId } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  const verified = verifyContentPreviewToken(token, { expectedPageId: pageId });
  if (!verified.ok) {
    notFound();
  }

  const page = await getContentPageById(verified.pageId);
  if (!page) {
    notFound();
  }

  if (isHomepagePreview(page)) {
    return (
      <div className="w-full max-w-none">
        {/* Abstand unter fixed Header; Blöcke darunter kantenbündig wie `/`. */}
        <div className="w-full pt-[calc(var(--storefront-header-height,3.75rem)+2.25rem)]">
          <PreviewNotice status={page.status} variant="banner" />
        </div>
        <h1 className="sr-only">{page.title}</h1>
        <div className="w-full max-w-none">
          <ContentBlocksRenderer blocks={page.blocks} pageType="homepage" />
        </div>
      </div>
    );
  }

  if (page.pageType === "legal") {
    return (
      <article
        className={`mx-auto max-w-3xl px-4 sm:px-6 ${storefrontMainPagePaddingClass}`}
      >
        <PreviewNotice status={page.status} variant="card" />
        <header className="mb-8 mt-6">
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
      <PreviewNotice status={page.status} variant="card" />
      <header className="mb-8 mt-6 max-w-3xl">
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
