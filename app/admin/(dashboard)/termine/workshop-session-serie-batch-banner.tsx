"use client";

import { useState, useTransition } from "react";
import { bulkPublishWorkshopSeriesBatchAction } from "@/app/admin/(dashboard)/termine/actions";

export function WorkshopSessionSerieBatchBanner({
  batchId,
  createdCount,
  draftCount,
}: {
  batchId: string;
  createdCount: number;
  draftCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (draftCount <= 0) {
    return (
      <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
        {createdCount} Entwürfe aus der Serie angelegt — alle bereits veröffentlicht oder bearbeitet.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
      <p>
        {createdCount} Entwürfe aus der Serie angelegt ({draftCount} noch Entwurf). Beginn und Details kannst du
        vor dem Veröffentlichen noch einzeln prüfen.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await bulkPublishWorkshopSeriesBatchAction(batchId);
              if (result && !result.ok) setError(result.message);
            });
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
        >
          {pending ? "Veröffentliche …" : `Alle ${draftCount} Entwürfe veröffentlichen`}
        </button>
        {error ? (
          <p className="text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
