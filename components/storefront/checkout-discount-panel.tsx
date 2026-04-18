"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Props = {
  committedCode: string;
  setCommittedCode: (code: string) => void;
  declineAutomatic: boolean;
  setDeclineAutomatic: (v: boolean) => void;
  previewLoading: boolean;
  codeError: string | null;
};

export function CheckoutDiscountPanel({
  committedCode,
  setCommittedCode,
  declineAutomatic,
  setDeclineAutomatic,
  previewLoading,
  codeError,
}: Props) {
  const errId = useId();
  const [draft, setDraft] = useState(committedCode);

  useEffect(() => {
    setDraft(committedCode);
  }, [committedCode]);

  const onApply = () => {
    const n = draft.trim().toUpperCase();
    setCommittedCode(n);
    setDeclineAutomatic(false);
  };

  const onRemoveCode = () => {
    setDraft("");
    setCommittedCode("");
  };

  return (
    <div className="mt-6 border-t border-(--surface-muted) pt-6">
      <label className="text-sm font-medium text-(--foreground-muted)" htmlFor={`${errId}-code`}>
        Rabattcode oder Gutschein
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={`${errId}-code`}
          type="text"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          placeholder="Code eingeben"
          className="min-w-0 flex-1 rounded-md border border-(--surface-muted) bg-white px-3 py-2 text-sm uppercase placeholder:normal-case placeholder:text-[#9ca3af]"
          aria-invalid={!!codeError}
          aria-describedby={codeError ? `${errId}-promo-err` : undefined}
        />
        <button
          type="button"
          onClick={onApply}
          disabled={previewLoading}
          className="shrink-0 rounded-md border border-(--surface-muted) bg-white px-3 py-2 text-sm font-medium text-(--foreground-heading) transition-colors hover:bg-(--surface-soft) disabled:opacity-60"
        >
          {previewLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Anwenden"}
        </button>
      </div>
      {codeError ? (
        <p id={`${errId}-promo-err`} className="mt-2 text-sm text-red-600" role="alert">
          {codeError}
        </p>
      ) : null}
      {committedCode ? (
        <button
          type="button"
          onClick={onRemoveCode}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          Code entfernen
        </button>
      ) : null}
      <input type="hidden" name="checkoutPromotionCode" value={committedCode} />
      <input type="hidden" name="checkoutDeclineAutomatic" value={declineAutomatic ? "1" : ""} />
    </div>
  );
}

export function AutomaticPromotionDismiss({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-(--surface-muted)/40 px-3 py-2 text-xs text-(--foreground-muted)">
      <span>Automatischer Rabatt aktiv</span>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-(--foreground-heading) hover:bg-white/80"
        aria-label="Automatischen Rabatt entfernen"
      >
        <X className="size-3.5" aria-hidden />
        Entfernen
      </button>
    </div>
  );
}
