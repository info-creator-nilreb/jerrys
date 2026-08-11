import Link from "next/link";
import {
  CONTENT_PAGE_STATUS_LABELS,
  CONTENT_PAGE_TYPE_LABELS,
} from "@/lib/content/block-type-labels";
import { listContentPages } from "@/lib/content/content-pages";
import { publicPathForContentSlug } from "@/lib/content/reserved-slugs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inhalte",
};

export default async function AdminInhaltePage() {
  const pages = await listContentPages();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            Inhalte
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            CMS-Seiten und Blöcke (Entwurf/Veröffentlichung). Öffentliches Routing folgt in einem
            späteren Slice.
          </p>
        </div>
        <Link
          href="/admin/inhalte/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
        >
          Neue Seite
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">
          Noch keine CMS-Seiten.{" "}
          <Link href="/admin/inhalte/new" className="font-medium text-primary hover:underline">
            Erste Seite anlegen
          </Link>
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-[#e8eaed]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Pfad</th>
                <th className="px-4 py-3 font-medium">Typ</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {pages.map((p) => (
                <tr key={p.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-[#1f2937]">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">
                    {publicPathForContentSlug(p.slug)}
                  </td>
                  <td className="px-4 py-3 text-[#374151]">
                    {CONTENT_PAGE_TYPE_LABELS[p.pageType]}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "published" ? (
                      <span className="text-emerald-700">
                        {CONTENT_PAGE_STATUS_LABELS.published}
                      </span>
                    ) : (
                      <span className="text-[#9ca3af]">
                        {CONTENT_PAGE_STATUS_LABELS.draft}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/inhalte/${p.id}/edit`}
                      className="font-medium text-primary hover:underline"
                    >
                      Bearbeiten
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
