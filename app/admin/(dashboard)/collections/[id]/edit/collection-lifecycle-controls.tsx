"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCollectionAction,
  setCollectionActiveAction,
} from "@/app/admin/(dashboard)/collections/lifecycle-actions";

export function CollectionLifecycleControls({
  collectionId,
  isActive,
  title,
}: {
  collectionId: string;
  isActive: boolean;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function setActive(next: boolean) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setCollectionActiveAction(collectionId, next);
      if (result?.ok) {
        setMessage(result.message ?? (next ? "Aktiviert." : "Deaktiviert."));
        router.refresh();
      } else {
        setError(result?.message ?? "Statusänderung fehlgeschlagen.");
      }
    });
  }

  function remove() {
    const ok = window.confirm(
      `„${title}“ unwiderruflich löschen?\n\nProdukt- und Kategorie-Verknüpfungen werden entfernt. Produkte bleiben erhalten.`,
    );
    if (!ok) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteCollectionAction(collectionId);
      if (result && !result.ok) {
        setError(
          result.skipped?.[0]?.reason ?? result.message ?? "Löschen fehlgeschlagen.",
        );
      }
    });
  }

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Sichtbarkeit & Löschen</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Deaktivieren blendet die Kollektion im Shop aus. Löschen entfernt nur die Kollektion —
        Produkte bleiben erhalten.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {isActive ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setActive(false)}
            className="rounded-md border border-[#e3e4e8] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
          >
            Deaktivieren
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setActive(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-50"
          >
            Aktivieren
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
          Kollektion löschen
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-sm font-medium text-primary" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
