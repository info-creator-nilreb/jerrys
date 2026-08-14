"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { bulkDeleteCustomersAction } from "@/app/admin/(dashboard)/customers/lifecycle-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orderStatusLabel } from "@/lib/orders/order-status-label";

export type CustomersAdminListItem = {
  customerKey: string;
  customerNumber: string;
  displayName: string;
  email: string;
  latestOrderStatus: string;
  orderCount: number;
  lastOrderAtLabel: string;
  deletable: boolean;
};

export function CustomersAdminList({ customers }: { customers: CustomersAdminListItem[] }) {
  const router = useRouter();
  const deletableCustomers = useMemo(() => customers.filter((c) => c.deletable), [customers]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ customerKey: string; reason: string }[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const selectedList = useMemo(() => [...selected], [selected]);
  const selectedCount = selected.size;
  const allDeletableSelected =
    deletableCustomers.length > 0 && deletableCustomers.every((c) => selected.has(c.customerKey));

  function toggleOne(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleAllDeletable(checked: boolean) {
    setSelected(checked ? new Set(deletableCustomers.map((c) => c.customerKey)) : new Set());
  }

  function confirmDeleteSelected() {
    setConfirmDeleteOpen(false);
    setError(null);
    setMessage(null);
    setSkipped([]);
    startTransition(async () => {
      const result = await bulkDeleteCustomersAction(selectedList);
      if (result.affectedCustomerKeys.length > 0) {
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
      {deletableCustomers.length > 0 ? (
        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
            <p className="text-sm text-[#374151]">
              {selectedCount > 0
                ? `${selectedCount} ausgewählt`
                : "Import-Kunden ohne Konto auswählen zum Entfernen"}
            </p>
            <button
              type="button"
              disabled={pending || selectedCount === 0}
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Entfernen
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
                <li key={s.customerKey}>{s.reason}</li>
              ))}
            </ul>
          ) : null}
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Kunden entfernen?"
            description={`${selectedCount} Kunde(n) und deren Import-Bestellungen unwiderruflich löschen?\n\nNur für Import-Aufräumen — nicht für Kunden mit Konto oder geschützten Bestellungen.`}
            confirmLabel="Unwiderruflich löschen"
            pending={pending}
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={confirmDeleteSelected}
          />
        </div>
      ) : null}

      <ul className={`space-y-3 md:hidden ${deletableCustomers.length > 0 ? "mt-4" : "mt-8"}`}>
        {customers.map((c) => (
          <li key={c.customerKey} className="flex gap-3">
            {c.deletable ? (
              <input
                type="checkbox"
                checked={selected.has(c.customerKey)}
                disabled={pending}
                onChange={(e) => toggleOne(c.customerKey, e.target.checked)}
                aria-label={`Kunde ${c.displayName} auswählen`}
                className="mt-5 size-4 shrink-0 rounded border-[#d1d5db] text-primary focus:ring-primary"
              />
            ) : (
              <span className="mt-5 size-4 shrink-0" aria-hidden />
            )}
            <Link
              href={`/admin/customers/${c.customerKey}`}
              className="block min-w-0 flex-1 rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm transition-colors hover:border-primary/40"
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
                {c.lastOrderAtLabel}
              </p>
              <span className="mt-3 inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-primary">
                Details
                <ChevronRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div
        className={`hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block ${deletableCustomers.length > 0 ? "mt-4" : "mt-8"}`}
      >
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {deletableCustomers.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={allDeletableSelected}
                    disabled={pending || deletableCustomers.length === 0}
                    onChange={(e) => toggleAllDeletable(e.target.checked)}
                    aria-label="Alle löschbaren Kunden auswählen"
                    className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                  />
                ) : null}
              </th>
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
                  {c.deletable ? (
                    <input
                      type="checkbox"
                      checked={selected.has(c.customerKey)}
                      disabled={pending}
                      onChange={(e) => toggleOne(c.customerKey, e.target.checked)}
                      aria-label={`Kunde ${c.displayName} auswählen`}
                      className="size-4 rounded border-[#d1d5db] text-primary focus:ring-primary"
                    />
                  ) : null}
                </td>
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
                <td className="whitespace-nowrap px-4 py-3 text-[#6b7280]">{c.lastOrderAtLabel}</td>
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
  );
}
