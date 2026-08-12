"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  bulkDeleteProductsAction,
  bulkSetProductsActiveAction,
} from "@/app/admin/(dashboard)/products/lifecycle-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatPrice } from "@/lib/catalog/format";

export type AdminProductListRow = {
  id: string;
  title: string;
  slug: string;
  currency: string;
  isActive: boolean;
  priceGrossCents: number;
  thumbUrl: string | null;
};

export function ProductsAdminTable({ products }: { products: AdminProductListRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ id: string; reason: string }[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const selectedCount = selected.size;
  const selectedList = useMemo(() => [...selected], [selected]);

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set());
  }

  function runBulk(
    action: () => Promise<{
      ok?: boolean;
      message?: string;
      skipped?: { id: string; reason: string }[];
    } | null>,
  ) {
    setError(null);
    setMessage(null);
    setSkipped([]);
    startTransition(async () => {
      const result = await action();
      if (!result) return;
      if (result.ok) {
        setMessage(result.message ?? "Erledigt.");
        setSelected(new Set());
        router.refresh();
      } else {
        setError(result.message ?? "Aktion fehlgeschlagen.");
      }
      if (result.skipped?.length) setSkipped(result.skipped);
    });
  }

  function activateSelected(active: boolean) {
    if (selectedList.length === 0) return;
    runBulk(() => bulkSetProductsActiveAction(selectedList, active));
  }

  function deleteSelected() {
    if (selectedList.length === 0) return;
    setConfirmDeleteOpen(true);
  }

  function confirmDeleteSelected() {
    setConfirmDeleteOpen(false);
    runBulk(() => bulkDeleteProductsAction(selectedList));
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
        <p className="text-sm text-[#374151]">
          {selectedCount > 0
            ? `${selectedCount} ausgewählt`
            : "Produkte auswählen für Bulk-Aktionen"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={() => activateSelected(true)}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-50"
          >
            Aktivieren
          </button>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={() => activateSelected(false)}
            className="rounded-md border border-[#e3e4e8] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Deaktivieren
          </button>
          <button
            type="button"
            disabled={pending || selectedCount === 0}
            onClick={deleteSelected}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden />
            Löschen
          </button>
        </div>
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
        <ul className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {skipped.map((s) => (
            <li key={s.id}>
              <span className="font-mono text-xs">{s.id.slice(0, 8)}…</span>: {s.reason}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Produkte löschen?"
        description={`${selectedList.length} Produkt(e) unwiderruflich löschen?\n\nProdukte mit Bestellungen oder Lagerbewegungen werden übersprungen.`}
        confirmLabel="Unwiderruflich löschen"
        pending={pending}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmDeleteSelected}
      />

      {/* Mobile: Card-Liste */}
      <ul className="space-y-3 md:hidden">
        {products.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-[#e8eaed] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={selected.has(p.id)}
                aria-label={`${p.title} auswählen`}
                onChange={(e) => toggleOne(p.id, e.target.checked)}
                disabled={pending}
              />
              {p.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail
                <img src={p.thumbUrl} alt="" className="size-14 rounded-lg object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-lg bg-[#f3f4f6] text-xs text-[#9ca3af]">
                  —
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#1f2937]">{p.title}</p>
                <p className="mt-0.5 truncate font-mono text-xs text-[#6b7280]">{p.slug}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="tabular-nums">{formatPrice(p.priceGrossCents, p.currency)}</span>
                  {p.isActive ? (
                    <span className="text-emerald-700">Aktiv</span>
                  ) : (
                    <span className="text-[#9ca3af]">Inaktiv</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {p.isActive ? (
                    <a
                      href={`/produkte/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Vorschau
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                  >
                    Bearbeiten
                  </Link>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop/Tablet: Tabelle */}
      <div className="hidden overflow-x-auto rounded-lg border border-[#e8eaed] md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#e8eaed] bg-[#f7f8fa] text-[#374151]">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  aria-label="Alle Produkte auswählen"
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={pending || products.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-medium">Titel</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Preis</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eaed]">
            {products.map((p) => (
              <tr key={p.id} className="bg-white">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    aria-label={`${p.title} auswählen`}
                    onChange={(e) => toggleOne(p.id, e.target.checked)}
                    disabled={pending}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Admin thumbnail
                      <img
                        src={p.thumbUrl}
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
                <td className="px-4 py-3">
                  {formatPrice(p.priceGrossCents, p.currency)}
                </td>
                <td className="px-4 py-3">
                  {p.isActive ? (
                    <span className="text-emerald-700">Aktiv</span>
                  ) : (
                    <span className="text-[#9ca3af]">Inaktiv</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                    {p.isActive ? (
                      <a
                        href={`/produkte/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Vorschau
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : (
                      <span
                        className="text-[#9ca3af]"
                        title="Produkt ist inaktiv — Shop-Seite erst nach Aktivierung erreichbar"
                      >
                        Keine Vorschau
                      </span>
                    )}
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="font-medium text-primary hover:underline"
                    >
                      Bearbeiten
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
