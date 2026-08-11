import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentBlocksRenderer } from "@/components/content/content-blocks-renderer";
import { getContentPageById } from "@/lib/content/content-pages";
import { verifyContentPreviewToken } from "@/lib/content/preview-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inhaltsvorschau",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ token?: string }>;
};

/**
 * Signierte, kurzlebige CMS-Vorschau (Draft oder Published).
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div
        className="mb-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        role="status"
      >
        <p className="font-semibold">Vorschau — nicht öffentlich</p>
        <p className="mt-1 text-amber-900/90">
          Status: {page.status === "published" ? "Veröffentlicht" : "Entwurf"}. Diese URL
          ist signiert, zeitlich begrenzt und nicht für Suchmaschinen bestimmt.
        </p>
      </div>
      <h1 className="sr-only">{page.title}</h1>
      <ContentBlocksRenderer blocks={page.blocks} pageType={page.pageType} />
    </div>
  );
}
