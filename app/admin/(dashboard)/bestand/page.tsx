import Link from "next/link";
import { listStockMovementsForAdmin } from "@/lib/inventory/admin-stock-movements-queries";
import { stockMovementReasonLabel } from "@/lib/inventory/stock-movement-labels";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestandsbewegungen",
};

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminStockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const { rows, nextCursor, hasMore } = await listStockMovementsForAdmin({ cursor });

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
          Bestandsbewegungen
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Audit-Trail zu Reservierungen, Versand und Lager — inkl. Varianten-SKU.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">Noch keine Bewegungen protokolliert.</p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-lg border border-[#e8eaed]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                <tr>
                  <th className="px-4 py-3 font-medium">Zeit</th>
                  <th className="px-4 py-3 font-medium">Produkt</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Grund</th>
                  <th className="px-4 py-3 font-medium text-right">Menge</th>
                  <th className="px-4 py-3 font-medium text-right">Bestellung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8eaed]">
                {rows.map((m) => (
                  <tr key={m.id} className="bg-white">
                    <td className="whitespace-nowrap px-4 py-3 text-[#6b7280]">
                      {dateFmt.format(m.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1f2937]">
                      <Link
                        href={`/admin/products/${m.product.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        {m.product.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">
                      {m.productVariant?.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#374151]">{stockMovementReasonLabel(m.reason)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-[#1f2937]">
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.orderId ? (
                        <Link
                          href={`/admin/orders/${m.orderId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Ansehen
                        </Link>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && nextCursor ? (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/admin/bestand?cursor=${encodeURIComponent(nextCursor)}`}
                className="rounded-md border border-[#e3e4e8] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Ältere Einträge laden
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
