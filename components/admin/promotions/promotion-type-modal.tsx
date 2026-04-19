"use client";

import { Percent, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId } from "react";
import {
  PROMOTION_TYPES,
  PROMOTION_TYPE_DESCRIPTIONS,
  type PromotionTypeId,
} from "@/lib/promotions/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PromotionTypeModal({ open, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if (open) node.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectType = (id: PromotionTypeId) => {
    onClose();
    router.push(`/admin/promotions/new?type=${encodeURIComponent(id)}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Modal schließen"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-xl border border-[#e8eaed] bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-[#1f2937]">
              Promotionsart auswählen
            </h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Wähle die Art der Aktion. Pro Checkout wird höchstens eine automatische Promotion
              angewendet; bei Code-Einlösung gilt der eingegebene Code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]"
            aria-label="Schließen"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {(Object.keys(PROMOTION_TYPES) as PromotionTypeId[]).map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => selectType(id)}
                className="flex w-full items-center gap-4 rounded-lg border border-[#e8eaed] bg-[#fafbfc] px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-white"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {id === "free_shipping" ? (
                    <Truck className="size-5" aria-hidden />
                  ) : (
                    <Percent className="size-5" aria-hidden />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-medium text-[#1f2937]">{PROMOTION_TYPES[id]}</span>
                  <span className="mt-0.5 block text-xs text-[#6b7280]">
                    {PROMOTION_TYPE_DESCRIPTIONS[id]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
