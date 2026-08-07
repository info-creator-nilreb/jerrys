import Link from "next/link";
import { listCollectionsForAdmin } from "@/lib/catalog/collection-queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kollektionen",
};

export default async function AdminCollectionsPage() {
  const collections = await listCollectionsForAdmin();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Kollektionen</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Produktgruppen für Merchandising und Storefront-Listen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products"
            className="rounded-md border border-[#e3e4e8] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            Zum Katalog
          </Link>
          <Link
            href="/admin/collections/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
          >
            Neue Kollektion
          </Link>
        </div>
      </div>

      {collections.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">
          Noch keine Kollektionen.{" "}
          <Link href="/admin/collections/new" className="font-medium text-primary hover:underline">
            Erste Kollektion anlegen
          </Link>
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-[#e8eaed]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Produkte</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {collections.map((c) => (
                <tr key={c.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-[#1f2937]">{c.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{c.slug}</td>
                  <td className="px-4 py-3 tabular-nums text-[#374151]">{c._count.products}</td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span className="text-emerald-700">Aktiv</span>
                    ) : (
                      <span className="text-[#9ca3af]">Inaktiv</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/collections/${c.id}/edit`}
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
