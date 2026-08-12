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
            Startseite, Rechtstexte und freie Seiten. Live-Vorschau beim Bearbeiten; veröffentlicht
            unter der jeweiligen URL.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inhalte/marketing"
            className="inline-flex min-h-11 items-center rounded-md border border-[#e3e4e8] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            Marketing
          </Link>
          <Link
            href="/admin/inhalte/new"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
          >
            Neue Seite
          </Link>
        </div>
      </div>

      {pages.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">
          Noch keine CMS-Seiten.{" "}
          <Link href="/admin/inhalte/new" className="font-medium text-primary hover:underline">
            Erste Seite anlegen
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-8 space-y-3 md:hidden">
            {pages.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1f2937]">{p.title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-[#6b7280]">
                      {publicPathForContentSlug(p.slug)}
                    </p>
                  </div>
                  {p.status === "published" ? (
                    <span className="shrink-0 text-sm text-emerald-700">
                      {CONTENT_PAGE_STATUS_LABELS.published}
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm text-[#9ca3af]">
                      {CONTENT_PAGE_STATUS_LABELS.draft}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#6b7280]">
                  {CONTENT_PAGE_TYPE_LABELS[p.pageType]}
                </p>
                <Link
                  href={`/admin/inhalte/${p.id}/edit`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                >
                  Bearbeiten
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
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
        </>
      )}
    </div>
  );
}
