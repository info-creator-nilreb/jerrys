"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction } from "@/app/admin/(dashboard)/customers/lifecycle-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CustomerLifecycleControls({
  customerKey,
  displayName,
  orderCount,
  deletable,
  deleteBlocker,
}: {
  customerKey: string;
  displayName: string;
  orderCount: number;
  deletable: boolean;
  deleteBlocker: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function remove() {
    setConfirmOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomerAction(customerKey);
      if (result.affectedCustomerKeys.includes(customerKey)) {
        router.push("/admin/customers");
        router.refresh();
        return;
      }
      setError(result.skipped[0]?.reason ?? result.message ?? "Löschen fehlgeschlagen.");
    });
  }

  return (
    <section className="mt-8 rounded-lg border border-[#e8eaed] bg-[#f9fafb] p-5">
      <h2 className="text-base font-semibold text-[#1f2937]">Löschen</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Import-Kunden ohne Kundenkonto können zum Aufräumen entfernt werden — dabei werden alle
        zugehörigen Shopify-Import-Bestellungen gelöscht. Echte Shop-Kunden und Konten bleiben
        geschützt.
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {deletable ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
          Kunde entfernen
        </button>
      ) : (
        <p className="mt-3 text-sm text-[#6b7280]">
          {deleteBlocker ?? "Dieser Kunde kann nicht gelöscht werden."}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Kunde entfernen?"
        description={`„${displayName}“ und ${orderCount} Import-Bestellung(en) unwiderruflich löschen?\n\nNur für Import-Aufräumen — nicht für Kunden mit Konto oder geschützten Bestellungen.`}
        confirmLabel="Unwiderruflich löschen"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </section>
  );
}
