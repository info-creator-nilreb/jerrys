import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listCustomersForAdmin } from "@/lib/admin/customer-queries";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kunden",
};

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminCustomersPage() {
  const customers = await listCustomersForAdmin();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">Kunden</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Kunden werden aus Bestellungen abgeleitet (gleiche E-Mail). Unterschiedliche Adressen pro
          Bestellung sind möglich.
        </p>
      </div>

      {customers.length === 0 ? (
        <p className="mt-8 text-sm text-[#6b7280]">Noch keine Kunden mit Bestellungen vorhanden.</p>
      ) : (
        <>
          <ul className="mt-8 space-y-3 md:hidden">
            {customers.map((c) => (
              <li key={c.customerKey}>
                <Link
                  href={`/admin/customers/${c.customerKey}`}
                  className="block rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#1f2937]">{c.displayName}</p>
                      <p className="mt-0.5 truncate text-xs text-[#6b7280]">{c.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {orderStatusLabel(c.latestOrderStatus)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-[#6b7280]">{c.customerNumber}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {c.orderCount} {c.orderCount === 1 ? "Bestellung" : "Bestellungen"} ·{" "}
                    {dateFmt.format(c.lastOrderAt)}
                  </p>
                  <span className="mt-3 inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-primary">
                    Details
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kunde
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kundennummer
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bestellungen
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Letzte Aktivität
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8eaed]">
                {customers.map((c) => (
                  <tr key={c.customerKey} className="bg-white">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#374151]">{c.displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#6b7280]">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#374151]">{c.customerNumber}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        {orderStatusLabel(c.latestOrderStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280]">{c.orderCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#6b7280]">
                      {dateFmt.format(c.lastOrderAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/customers/${c.customerKey}`}
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
        </>
      )}
    </div>
  );
}
