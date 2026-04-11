import Link from "next/link";
import { formatPrice } from "@/lib/catalog/format";
import { listOrdersForAdmin } from "@/lib/orders/admin-queries";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bestellungen",
};

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminOrdersPage() {
  const orders = await listOrdersForAdmin();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Bestellungen</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Eingegangene Shop-Bestellungen</p>
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">Noch keine Bestellungen vorhanden.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-[#e8eaed]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
              <tr>
                <th className="px-4 py-3 font-medium">Bestellnr.</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Positionen</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Summe</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8eaed]">
              {orders.map((o) => (
                <tr key={o.id} className="bg-white">
                  <td className="px-4 py-3 font-mono text-xs text-[#374151]">{o.orderNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#6b7280]">{dateFmt.format(o.createdAt)}</td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-[#374151]">{o.email}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{o._count.items}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatPrice(o.totalGrossCents, o.currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Details
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
