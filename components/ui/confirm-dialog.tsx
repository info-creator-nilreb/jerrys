"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destruktive Primäraktion (rot). */
  variant?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Barrierefreier Bestätigungs-Dialog (ersetzt Browser-confirm/alert).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  variant = "danger",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      prev?.focus?.();
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700"
      : "bg-primary text-white hover:bg-(--primary-hover) focus-visible:ring-primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Dialog schließen"
        disabled={pending}
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl border border-[#e8eaed] bg-white p-5 shadow-xl outline-none sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-[#1f2937]">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 whitespace-pre-line text-sm text-[#6b7280]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="shrink-0 rounded-md p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] disabled:opacity-50"
            aria-label="Schließen"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${confirmClass}`}
          >
            {pending ? "Bitte warten…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
