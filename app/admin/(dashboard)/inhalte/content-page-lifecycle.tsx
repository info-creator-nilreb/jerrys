"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  publishContentPageAction,
  unpublishContentPageAction,
  type ContentPageLifecycleState,
} from "@/app/admin/(dashboard)/inhalte/actions";

export function ContentPageLifecycle({
  pageId,
  status,
  previewUrl,
  previewExpiresLabel,
}: {
  pageId: string;
  status: "draft" | "published";
  previewUrl: string | null;
  previewExpiresLabel: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function run(fn: () => Promise<ContentPageLifecycleState>) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result) return;
      if (result.ok) {
        router.refresh();
        return;
      }
      setErrorMessage(result.error ?? "Aktion fehlgeschlagen.");
    });
  }

  return (
    <div className="rounded-xl border border-[#e8eaed] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#1f2937]">Veröffentlichung</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            Aktuell:{" "}
            <span className="font-medium text-[#1f2937]">
              {status === "published" ? "Veröffentlicht" : "Entwurf"}
            </span>
            . Entwürfe erscheinen nicht in Sitemap oder Navigation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[#e3e4e8] bg-white px-3 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              <ExternalLink className="size-4" aria-hidden strokeWidth={1.75} />
              Vorschau
            </a>
          ) : null}
          {status === "draft" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => publishContentPageAction(pageId))}
              className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-(--primary-hover) disabled:opacity-60"
            >
              {pending ? "…" : "Veröffentlichen"}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => unpublishContentPageAction(pageId))}
              className="min-h-11 rounded-md border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-60"
            >
              {pending ? "…" : "Auf Entwurf setzen"}
            </button>
          )}
        </div>
      </div>
      {previewExpiresLabel ? (
        <p className="mt-3 text-xs text-[#9ca3af]">
          Vorschau-Link gültig bis {previewExpiresLabel} (signiert, nicht indexierbar).
        </p>
      ) : previewUrl === null ? (
        <p className="mt-3 text-xs text-amber-800">
          Vorschau nicht verfügbar — AUTH_SECRET bzw. CONTENT_PREVIEW_SECRET fehlt.
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
