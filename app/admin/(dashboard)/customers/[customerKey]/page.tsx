import Link from "next/link";
import { notFound } from "next/navigation";
import type { AdminCustomerAddressBlock } from "@/lib/admin/customer-queries";
import { getCustomerDetailForAdmin } from "@/lib/admin/customer-queries";
import { formatPrice } from "@/lib/catalog/format";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function AddressCard({
  title,
  block,
}: {
  title: string;
  block: AdminCustomerAddressBlock;
}) {
  return (
    <div className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] p-4">
      <h2 className="text-xs font-semibold tracking-wide text-[#6b7280] uppercase">{title}</h2>
      <p className="mt-2 text-sm font-medium text-[#111827]">{block.nameLine}</p>
      {block.companyLine ? <p className="text-sm text-[#374151]">{block.companyLine}</p> : null}
      {block.streetLines.map((line, i) => (
        <p key={`${line}-${i}`} className="text-sm text-[#374151]">
          {line}
        </p>
      ))}
      <p className="text-sm text-[#374151]">{block.cityLine}</p>
      <p className="text-sm text-[#374151]">{block.country}</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ customerKey: string }>;
}) {
  const { customerKey } = await params;
  const detail = await getCustomerDetailForAdmin(customerKey);
  if (!detail) return { title: "Kunde" };
  return { title: `${detail.displayName} · Kunde` };
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerKey: string }>;
}) {
  const { customerKey } = await params;
  const detail = await getCustomerDetailForAdmin(customerKey);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-6xl rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            <Link href="/admin/customers" className="hover:underline">
              Kunden
            </Link>
            <span className="text-[#9ca3af]"> / </span>
            <span className="text-[#374151]">Profil</span>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#1f2937] sm:text-2xl">
            {detail.displayName}
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">{detail.email}</p>
          <p className="mt-2 font-mono text-xs text-[#374151]">{detail.customerNumber}</p>
        </div>
      </div>

      {detail.addressVariesAcrossOrders ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Die Lieferadresse weicht bei älteren Bestellungen von der aktuellsten ab. Unten ist die
          Adresse der letzten Bestellung dargestellt.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <AddressCard title="Lieferadresse (letzte Bestellung)" block={detail.shipping} />
        {detail.billingDiffersFromShipping ? (
          <AddressCard title="Rechnungsadresse (letzte Bestellung)" block={detail.billing} />
        ) : (
          <div className="flex items-center rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa] p-4 text-sm text-[#6b7280]">
            Rechnungsadresse entspricht der Lieferadresse.
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[#1f2937]">Bestellungen</h2>
        {detail.orders.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Keine Bestellungen.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[#e8eaed]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bestellnr.
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Datum
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Summe
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8eaed]">
                {detail.orders.map((o) => (
                  <tr key={o.id} className="bg-white">
                    <td className="px-4 py-3 font-mono text-xs text-[#374151]">{o.orderNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#6b7280]">
                      {dateFmt.format(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        {orderStatusLabel(o.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatPrice(o.totalGrossCents, o.currency)}
                    </td>
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
    </div>
  );
}
