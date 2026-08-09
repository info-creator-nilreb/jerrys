"use client";

import { useState, useTransition } from "react";
import { duplicateWorkshopSessionAction } from "@/app/admin/(dashboard)/termine/actions";

export function WorkshopSessionDuplicateButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErrorMessage(null);
          startTransition(async () => {
            const result = await duplicateWorkshopSessionAction(sessionId);
            if (result && !result.ok) {
              setErrorMessage(result.message);
            }
          });
        }}
        className="rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
      >
        {pending ? "Dupliziere …" : "Termin duplizieren"}
      </button>
      {errorMessage ? (
        <p className="max-w-xs text-right text-xs text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
