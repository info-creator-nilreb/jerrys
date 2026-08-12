import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPageForm } from "@/app/admin/(dashboard)/inhalte/content-page-form";
import { ContentPageLifecycle } from "@/app/admin/(dashboard)/inhalte/content-page-lifecycle";
import { getAiContentSettingsPublic } from "@/features/integrations";
import { listActiveProductsForStorefront } from "@/lib/catalog/queries";
import { getContentPageById } from "@/lib/content/content-pages";
import { contentPreviewAbsoluteUrl } from "@/lib/content/preview-token";
import { isDatabaseUnreachable } from "@/lib/db/is-database-unreachable";
import { HOME_PAGE_STABLE_ID } from "@/lib/content/migrate-storefront-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inhalt bearbeiten",
};

export default async function AdminInhalteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getContentPageById(id);
  if (!page) notFound();

  const preview = contentPreviewAbsoluteUrl(page.id);
  const previewUrl = preview.ok ? preview.url : null;
  const previewExpiresLabel = preview.ok
    ? preview.expiresAt.toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  let previewProducts: Array<{
    id: string;
    title: string;
    imageUrl: string | null;
  }> = [];
  try {
    const products = await listActiveProductsForStorefront();
    previewProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.images[0]?.url ?? null,
    }));
  } catch (e) {
    if (!isDatabaseUnreachable(e)) throw e;
  }

  const aiSettings = await getAiContentSettingsPublic();

  const isHome =
    page.pageType === "homepage" ||
    page.id === HOME_PAGE_STABLE_ID ||
    page.slug === "home";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
        <Link
          href="/admin/inhalte"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Inhalte
        </Link>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
          {page.title}
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Änderungen erscheinen sofort in der Live-Vorschau — Speichern übernimmt sie dauerhaft.
        </p>
        {isHome ? (
          <p className="mt-3 text-sm text-[#374151]">
            Kundenstimmen &amp; Social-Bilder:{" "}
            <Link
              href="/admin/inhalte/marketing"
              className="font-medium text-primary hover:underline"
            >
              Marketing-Inhalte pflegen
            </Link>
          </p>
        ) : null}
      </div>
      <ContentPageLifecycle
        pageId={page.id}
        status={page.status}
        previewUrl={previewUrl}
        previewExpiresLabel={previewExpiresLabel}
      />
      <ContentPageForm
        key={page.updatedAt.toISOString()}
        previewProducts={previewProducts}
        aiReady={aiSettings.ready}
        initial={{
          id: page.id,
          slug: page.slug,
          pageType: page.pageType,
          status: page.status,
          title: page.title,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          ogImageUrl: page.ogImageUrl ?? "",
          canonicalPath: page.canonicalPath ?? "",
          robotsIndex: page.robotsIndex,
          previousSlug: page.previousSlug ?? "",
          blocks: page.blocks.map((b) => ({
            id: b.id,
            type: b.type,
            data:
              b.data && typeof b.data === "object" && !Array.isArray(b.data)
                ? (b.data as Record<string, unknown>)
                : {},
          })),
        }}
      />
    </div>
  );
}
