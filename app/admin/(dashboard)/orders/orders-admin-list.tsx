"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OrderTableRowLink } from "@/app/admin/(dashboard)/orders/order-table-row-link";
import { OrderTriplePill } from "@/app/admin/(dashboard)/orders/order-triple-pill";
import { formatPrice } from "@/lib/catalog/format";
import type { AdminTriple } from "@/lib/orders/order-admin-triple";

export type OrdersAdminListItem = {
  id: string;
  orderNumber: string;
  createdAtLabel: string;
  itemCount: number;
  totalGrossCents: number;
  currency: string;
  triple: AdminTriple;
};

export function OrdersAdminList({ orders }: { orders: OrdersAdminListItem[] }) {
  return (
    <>
      <ul className="mt-8 space-y-3 md:hidden">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/orders/${o.id}`}
              className="block rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-primary">{o.orderNumber}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">{o.createdAtLabel}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-[#1f2937]">
                  {formatPrice(o.totalGrossCents, o.currency)}
                </p>
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">
                {o.itemCount} {o.itemCount === 1 ? "Position" : "Positionen"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <OrderTriplePill triple={o.triple} dim="payment" />
                <OrderTriplePill triple={o.triple} dim="shipping" />
                <OrderTriplePill triple={o.triple} dim="order" />
              </div>
              <span className="mt-3 inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-primary">
                Öffnen
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
                Bestellnr.
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Datum
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Positionen
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Zahlung
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Lieferung
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Bestellung
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Summe
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Aktion</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eaed]">
            {orders.map((o) => (
              <OrderTableRowLink
                key={o.id}
                href={`/admin/orders/${o.id}`}
                ariaLabel={`Bestellung ${o.orderNumber} öffnen`}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[#6b7280]">{o.createdAtLabel}</td>
                <td className="px-4 py-3 text-[#6b7280]">{o.itemCount}</td>
                <td className="px-4 py-3">
                  <OrderTriplePill triple={o.triple} dim="payment" />
                </td>
                <td className="px-4 py-3">
                  <OrderTriplePill triple={o.triple} dim="shipping" />
                </td>
                <td className="px-4 py-3">
                  <OrderTriplePill triple={o.triple} dim="order" />
                </td>
                <td className="px-4 py-3 font-medium text-[#1f2937]">
                  {formatPrice(o.totalGrossCents, o.currency)}
                </td>
              </OrderTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
