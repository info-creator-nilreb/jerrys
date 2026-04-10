import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { listProductsForAdmin } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Katalog",
};

export default async function AdminProductsPage() {
  const products = await listProductsForAdmin();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Katalog</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Produkte für den Shop</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
        >
          Neues Produkt
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">
          Noch keine Produkte.{" "}
          <Link href="/admin/products/new" className="font-medium text-primary hover:underline">
            Erstes Produkt anlegen
          </Link>
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-[#e8eaed]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Preis</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {products.map((p) => {
                const thumb = p.images[0];
                return (
                  <tr key={p.id} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail, lokale Pfade
                          <img
                            src={thumb.url}
                            alt=""
                            className="size-10 rounded object-cover"
                          />
                        ) : (
                          <span className="flex size-10 items-center justify-center rounded bg-[#f3f4f6] text-xs text-[#9ca3af]">
                            —
                          </span>
                        )}
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{p.slug}</td>
                    <td className="px-4 py-3">{formatPrice(p.priceGrossCents, p.currency)}</td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <span className="text-emerald-700 dark:text-emerald-400">Aktiv</span>
                      ) : (
                        <span className="text-[#9ca3af]">Inaktiv</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
