"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { StorefrontSearchForm } from "@/components/storefront/storefront-search-form";

function useClientMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function StorefrontHeaderSearch() {
  const [open, setOpen] = useState(false);
  const mounted = useClientMounted();
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Fokus aufs Suchfeld im Dialog (erstes search-Input)
    const input = document.getElementById(`${panelId}-q`) as HTMLInputElement | null;
    input?.focus();
  }, [open, panelId]);

  const overlay =
    open && mounted ? (
      <div className="fixed inset-0 z-[600000] flex items-start justify-center px-4 pt-[max(4.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          aria-label="Suche schließen"
          onClick={close}
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className="relative z-[600001] w-full max-w-lg rounded-xl border border-(--surface-muted) bg-white p-4 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id={`${panelId}-title`}
              className="text-base font-semibold text-(--foreground-heading)"
            >
              Produkte suchen
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-soft) hover:text-(--foreground-heading) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Schließen"
              onClick={close}
            >
              <X className="size-5" aria-hidden strokeWidth={1.75} />
            </button>
          </div>
          <StorefrontSearchForm
            id={`${panelId}-q`}
            query=""
            compact
            autoFocus
            onSubmitted={close}
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="relative z-[500001] inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading) transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Produkte suchen"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(true)}
      >
        <Search className="size-6" aria-hidden strokeWidth={1.75} />
      </button>
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
