import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPageForm } from "@/app/admin/(dashboard)/inhalte/content-page-form";
import { getContentPageById } from "@/lib/content/content-pages";

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

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
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
        Blöcke hinzufügen, bearbeiten, umordnen oder entfernen — dann speichern.
      </p>
      <div className="mt-8">
        <ContentPageForm
          key={page.updatedAt.toISOString()}
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
    </div>
  );
}
