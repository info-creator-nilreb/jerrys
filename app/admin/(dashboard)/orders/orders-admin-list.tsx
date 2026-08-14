"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { bulkDeleteOrdersAction } from "@/app/admin/(dashboard)/orders/lifecycle-actions";
import { OrderTableRowLink } from "@/app/admin/(dashboard)/orders/order-table-row-link";
import { OrderTriplePill } from "@/app/admin/(dashboard)/orders/order-triple-pill";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  deletable: boolean;
};

export function OrdersAdminList({ orders }: { orders: OrdersAdminListItem[] }) {
  const router = useRouter();
  const deletableOrders = useMemo(() => orders.filter((o) => o.deletable), [orders]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ id: string; reason: string }[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const selectedList = useMemo(() => [...selected], [selected]);
  const selectedCount = selected.size;
  const allDeletableSelected =
    deletableOrders.length > 0 && deletableOrders.every((o) => selected.has(o.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllDeletable(checked: boolean) {
    setSelected(checked ? new Set(deletableOrders.map((o) => o.id)) : new Set());
  }

  function confirmDeleteSelected() {
    setConfirmDeleteOpen(false);
    setError(null);
    setMessage(null);
    setSkipped([]);
    startTransition(async () => {
      const result = await bulkDeleteOrdersAction(selectedList);
      if (result.affectedIds.length > 0) {
        setMessage(result.message ?? "Gelöscht.");
        setSelected(new Set());
        router.refresh();
      } else {
        setError(result.message ?? "Löschen fehlgeschlagen.");
      }
      if (result.skipped.length > 0) setSkipped(result.skipped);
    });
  }

  return (
    <>
      {deletableOrders.length > 0 ? (
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
            <p className="text-sm text-[#374151]">
              {selectedCount > 0
                ? `${selectedCount} ausgewählt`
                : "Shopify-Import-Bestellungen ohne Rechnung auswählen zum Löschen"}
            </p>
            <button
              type="button"
              disabled={pending || selectedCount === 0}
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Löschen
            </button>
          </div>
          {message ? (
            <p className="text-sm font-medium text-primary" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {skipped.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#6b7280]">
              {skipped.slice(0, 5).map((s) => (
                <li key={s.id}>{s.reason}</li>
              ))}
            </ul>
          ) : null}
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Bestellungen löschen?"
            description={`${selectedCount} Bestellung(en) unwiderruflich löschen?\n\nNur für Import-Aufräumen — nicht für Bestellungen mit Rechnung oder erfasster Zahlung.`}
            confirmLabel="Unwiderruflich löschen"
            pending={pending}
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={confirmDeleteSelected}
          />
        </div>
      ) : null}

      <ul className={`space-y-3 md:hidden ${deletableOrders.length > 0 ? "mt-4" : "mt-8"}`}>
        {orders.map((o) => (
          <li key={o.id} className="flex gap-3">
            {o.deletable ? (
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                disabled={pending}
                onChange={(e) => toggleOne(o.id, e.target.checked)}
                aria-label={`Bestellung ${o.orderNumber} auswählen`}
                className="mt-5 size-4 shrink-0 rounded border-[#d1d5db] text-primary focus:ring-primary"
              />
            ) : (
              <span className="mt-5 size-4 shrink-0" aria-hidden />
            )}
            <Link
              href={`/admin/orders/${o.id}`}
              className="block min-w-0 flex-1 rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm transition-colors hover:border-primary/40"
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

      <div
        className={`hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block ${deletableOrders.length > 0 ? "mt-4" : "mt-8"}`}
      >
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {deletableOrders.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allDeletableSelected}
                    disabled={pending || deletableOrders.length === 0}
                    onChange={(e) => toggleAllDeletable(e.target.checked)}
                    aria-label="Alle löschbaren Bestellungen auswählen"
                    className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                  />
                ) : null}
              </th>
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
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Öffnen
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
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {o.deletable ? (
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      disabled={pending}
                      onChange={(e) => toggleOne(o.id, e.target.checked)}
                      aria-label={`Bestellung ${o.orderNumber} auswählen`}
                      className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                    />
                  ) : null}
                </td>
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
