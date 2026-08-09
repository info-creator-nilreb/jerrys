"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelWorkshopSessionAction,
  completeWorkshopSessionAction,
  publishWorkshopSessionAction,
  type WorkshopSessionActionState,
} from "@/app/admin/(dashboard)/termine/actions";

export function WorkshopSessionLifecycleButtons({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function run(fn: () => Promise<WorkshopSessionActionState>) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result) return;
      if (result.ok) {
        router.refresh();
        return;
      }
      setErrorMessage(result.message);
    });
  }

  const hasActions =
    status === "draft" || status === "published" || status === "cancelled";

  if (!hasActions) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === "draft" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishWorkshopSessionAction(sessionId))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
          >
            Veröffentlichen
          </button>
        ) : null}
        {status === "published" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelWorkshopSessionAction(sessionId))}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60"
            >
              Termin absagen
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => completeWorkshopSessionAction(sessionId))}
              className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
            >
              Als abgeschlossen markieren
            </button>
          </>
        ) : null}
        {status === "cancelled" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => completeWorkshopSessionAction(sessionId))}
            className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            Als abgeschlossen markieren
          </button>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="max-w-sm text-right text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
