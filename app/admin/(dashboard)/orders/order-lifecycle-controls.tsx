"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrderAction } from "@/app/admin/(dashboard)/orders/lifecycle-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function OrderLifecycleControls({
  orderId,
  orderNumber,
  deletable,
  deleteBlocker,
}: {
  orderId: string;
  orderNumber: string;
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
      const result = await deleteOrderAction(orderId);
      if (result.affectedIds.includes(orderId)) {
        router.push("/admin/orders");
        router.refresh();
        return;
      }
      setError(result.skipped[0]?.reason ?? result.message ?? "Löschen fehlgeschlagen.");
    });
  }

  return (
    <section className="rounded-lg border border-[#e8eaed] bg-[#f9fafb] p-5">
      <h2 className="text-base font-semibold text-[#1f2937]">Löschen</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Shopify-Import-Bestellungen ohne Rechnung können zum Aufräumen gelöscht werden. Echte
        Shop-Bestellungen bleiben aus buchhalterischen Gründen geschützt.
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
          Bestellung löschen
        </button>
      ) : (
        <p className="mt-3 text-sm text-[#6b7280]">
          {deleteBlocker ?? "Diese Bestellung kann nicht gelöscht werden."}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Bestellung löschen?"
        description={`„${orderNumber}“ unwiderruflich löschen?\n\nNur für Import-Aufräumen — nicht für Bestellungen mit Rechnung oder erfasster Zahlung.`}
        confirmLabel="Unwiderruflich löschen"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={remove}
      />
    </section>
  );
}
